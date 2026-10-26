using Microsoft.Extensions.Configuration;

public sealed record TypingPrediction(
    int Samples,
    double FastGapProbability,
    double Confidence,
    double MeanGapMs);

public sealed record TypingDecision(
    string Action,
    string Recommendation,
    int CooldownMs,
    string Reason,
    bool Broadcast,
    TypingPrediction? Prediction,
    long? GapMs);

public sealed class TypingBurstModel
{
    private int _samples;
    private int _fastGaps;
    private double _totalGapMs;

    public int SampleCount => _samples;
    public int FastGapCount => _fastGaps;

    public void ObserveGap(long? gapMs)
    {
        if (gapMs is null || gapMs < 0) return;
        _samples++;
        _totalGapMs += gapMs.Value;
        if (gapMs <= 500) _fastGaps++;
    }

    public TypingPrediction? Predict()
    {
        if (_samples == 0) return null;
        return new TypingPrediction(
            _samples,
            (_fastGaps + 1d) / (_samples + 2d),
            _samples / (_samples + 3d),
            _totalGapMs / _samples);
    }
}

public sealed class TypingAdaptationService
{
    private sealed class Session
    {
        public bool IsTyping { get; set; }
        public DateTimeOffset? LastStartAt { get; set; }
        public DateTimeOffset? LastBroadcastAt { get; set; }
    }

    private readonly object _sync = new();
    private readonly TypingBurstModel _model = new();
    private readonly Dictionary<string, Session> _sessions = new(StringComparer.Ordinal);
    private long _typingStartReceived;
    private long _typingStartBroadcast;
    private long _typingStartSuppressed;
    private long _typingStopBroadcast;
    private TypingDecision? _lastDecision;

    public string Mode { get; }

    public TypingAdaptationService(IConfiguration configuration)
        : this(configuration["LNASF_MODE"], initialize: true)
    {
    }

    private TypingAdaptationService(string? mode, bool initialize)
    {
        Mode = mode is "passive" or "advisory" or "adaptive" ? mode : "passive";
    }

    public static TypingAdaptationService ForMode(string? mode) => new(mode, initialize: true);

    public TypingDecision HandleStart(string connectionId, DateTimeOffset now)
    {
        lock (_sync)
        {
            if (!_sessions.TryGetValue(connectionId, out var session))
            {
                session = new Session();
            }

            var gapMs = session.LastStartAt is null
                ? (long?)null
                : Math.Max(0, (long)(now - session.LastStartAt.Value).TotalMilliseconds);
            var prediction = _model.Predict();
            var sinceBroadcast = session.LastBroadcastAt is null
                ? (long?)null
                : Math.Max(0, (long)(now - session.LastBroadcastAt.Value).TotalMilliseconds);
            var decision = Decide(Mode, prediction, session.IsTyping, sinceBroadcast);

            _model.ObserveGap(gapMs);
            session.LastStartAt = now;
            _typingStartReceived++;
            var broadcast = decision.Action != "suppress";
            if (broadcast)
            {
                session.IsTyping = true;
                session.LastBroadcastAt = now;
                _typingStartBroadcast++;
            }
            else
            {
                _typingStartSuppressed++;
            }

            _sessions[connectionId] = session;
            _lastDecision = decision with { Broadcast = broadcast, Prediction = prediction, GapMs = gapMs };
            return _lastDecision;
        }
    }

    public TypingDecision HandleStop(string connectionId)
    {
        lock (_sync)
        {
            if (_sessions.TryGetValue(connectionId, out var session))
            {
                session.IsTyping = false;
                session.LastStartAt = null;
                session.LastBroadcastAt = null;
            }

            _typingStopBroadcast++;
            _lastDecision = new TypingDecision(
                "broadcast", "broadcast", 0,
                "Typing-stop events always pass through to preserve client typing state.",
                true, _model.Predict(), null);
            return _lastDecision;
        }
    }

    public void Remove(string connectionId)
    {
        lock (_sync) _sessions.Remove(connectionId);
    }

    public object GetSnapshot()
    {
        lock (_sync)
        {
            var prediction = _model.Predict();
            return new
            {
                framework = "LNASF",
                mode = Mode,
                learning = new
                {
                    gapSamples = _model.SampleCount,
                    fastGaps = _model.FastGapCount,
                    meanGapMs = prediction?.MeanGapMs
                },
                prediction = prediction is null ? null : new
                {
                    fastGapProbability = prediction.FastGapProbability,
                    confidence = prediction.Confidence
                },
                measurement = new
                {
                    typingStartReceived = _typingStartReceived,
                    typingStartBroadcast = _typingStartBroadcast,
                    typingStartSuppressed = _typingStartSuppressed,
                    typingStopBroadcast = _typingStopBroadcast,
                    duplicateSuppressionRate = _typingStartReceived == 0
                        ? 0d
                        : (double)_typingStartSuppressed / _typingStartReceived,
                    activeSessions = _sessions.Count
                },
                lastDecision = _lastDecision
            };
        }
    }

    public static TypingDecision Decide(
        string mode,
        TypingPrediction? prediction,
        bool isTyping,
        long? sinceLastBroadcastMs)
    {
        var probability = prediction?.FastGapProbability ?? 0.5d;
        var cooldownMs = probability >= 0.75d ? 500 : probability >= 0.55d ? 300 : 150;
        var enoughEvidence = prediction is not null && prediction.Samples >= 5 && prediction.Confidence >= 0.6d;
        var recommendedSuppress = enoughEvidence &&
            isTyping &&
            sinceLastBroadcastMs is not null &&
            sinceLastBroadcastMs >= 0 &&
            sinceLastBroadcastMs < cooldownMs;

        if (mode == "passive")
        {
            return new TypingDecision(
                "broadcast", recommendedSuppress ? "suppress-duplicate" : "broadcast", cooldownMs,
                "Passive mode learns without changing event delivery.", true, prediction, null);
        }

        if (mode == "advisory")
        {
            return new TypingDecision(
                "broadcast", recommendedSuppress ? "suppress-duplicate" : "broadcast", cooldownMs,
                "Advisory mode reports a recommendation but does not apply it.", true, prediction, null);
        }

        if (!enoughEvidence)
        {
            return new TypingDecision(
                "broadcast", "broadcast", cooldownMs,
                "Insufficient evidence; deterministic broadcast fallback is active.", true, prediction, null);
        }

        if (recommendedSuppress)
        {
            return new TypingDecision(
                "suppress", "suppress-duplicate", cooldownMs,
                "A learned burst prediction and bounded cooldown policy permit suppressing this duplicate start.",
                false, prediction, null);
        }

        return new TypingDecision(
            "broadcast", "broadcast", cooldownMs,
            "No duplicate suppression is justified for this event.", true, prediction, null);
    }
}
