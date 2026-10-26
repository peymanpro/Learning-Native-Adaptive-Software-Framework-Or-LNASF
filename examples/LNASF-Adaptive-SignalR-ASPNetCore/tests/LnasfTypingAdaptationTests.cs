using Xunit;

public class LnasfTypingAdaptationTests
{
    [Fact]
    public void ModelLearnsFastGapFrequencyAndExposesConfidence()
    {
        var model = new TypingBurstModel();
        Assert.Null(model.Predict());
        model.ObserveGap(100);
        model.ObserveGap(200);
        model.ObserveGap(900);
        var prediction = model.Predict();
        Assert.NotNull(prediction);
        Assert.Equal(3, prediction!.Samples);
        Assert.Equal(3d / 5d, prediction.FastGapProbability, 8);
        Assert.Equal(0.5d, prediction.Confidence, 8);
        Assert.Equal(400d, prediction.MeanGapMs, 8);
    }

    [Fact]
    public void PassiveModeRecommendsButNeverSuppresses()
    {
        var prediction = new TypingPrediction(10, 0.9, 10d / 13d, 100);
        var decision = TypingAdaptationService.Decide("passive", prediction, true, 50);
        Assert.Equal("broadcast", decision.Action);
        Assert.Equal("suppress-duplicate", decision.Recommendation);
        Assert.True(decision.Broadcast);
    }

    [Fact]
    public void AdvisoryModeKeepsPredictionSeparateFromAction()
    {
        var prediction = new TypingPrediction(8, 0.9, 8d / 11d, 100);
        var decision = TypingAdaptationService.Decide("advisory", prediction, true, 80);
        Assert.Equal("broadcast", decision.Action);
        Assert.Equal("suppress-duplicate", decision.Recommendation);
        Assert.True(decision.Broadcast);
    }

    [Fact]
    public void AdaptiveModeFallsBackUntilEvidenceIsSufficient()
    {
        var decision = TypingAdaptationService.Decide("adaptive", null, true, 20);
        Assert.Equal("broadcast", decision.Action);
        Assert.True(decision.Broadcast);
        Assert.Contains("Insufficient evidence", decision.Reason);
    }

    [Fact]
    public void AdaptiveModeSuppressesOnlyLearnedDuplicateStarts()
    {
        var prediction = new TypingPrediction(5, 6d / 7d, 5d / 8d, 100);
        var decision = TypingAdaptationService.Decide("adaptive", prediction, true, 50);
        Assert.Equal("suppress", decision.Action);
        Assert.False(decision.Broadcast);
        Assert.Equal(500, decision.CooldownMs);
    }

    [Fact]
    public void AdaptiveModeReducesDuplicateBroadcastsAgainstPassiveBaselineOnSameTrace()
    {
        var passive = TypingAdaptationService.ForMode("passive");
        var adaptive = TypingAdaptationService.ForMode("adaptive");
        var passiveBroadcasts = 0;
        var adaptiveBroadcasts = 0;
        for (var index = 0; index < 30; index++)
        {
            var now = DateTimeOffset.UnixEpoch.AddMilliseconds(index * 100);
            if (passive.HandleStart("same-trace", now).Broadcast) passiveBroadcasts++;
            if (adaptive.HandleStart("same-trace", now).Broadcast) adaptiveBroadcasts++;
        }

        Assert.Equal(30, passiveBroadcasts);
        Assert.True(adaptiveBroadcasts < passiveBroadcasts);
        var snapshotJson = System.Text.Json.JsonSerializer.Serialize(adaptive.GetSnapshot());
        Assert.Contains("typingStartSuppressed", snapshotJson);
    }

    [Fact]
    public void TypingStopAlwaysPassesThroughAndMetricsMeasureSuppression()
    {
        var service = TypingAdaptationService.ForMode("adaptive");
        for (var index = 0; index < 6; index++)
        {
            service.HandleStart("socket-a", DateTimeOffset.UnixEpoch.AddMilliseconds(index * 100));
        }

        var suppressed = service.HandleStart("socket-a", DateTimeOffset.UnixEpoch.AddMilliseconds(600));
        Assert.False(suppressed.Broadcast);
        Assert.True(service.HandleStop("socket-a").Broadcast);
        var json = System.Text.Json.JsonSerializer.Serialize(service.GetSnapshot());
        using var document = System.Text.Json.JsonDocument.Parse(json);
        var measurement = document.RootElement.GetProperty("measurement");
        Assert.Equal(1, measurement.GetProperty("typingStartSuppressed").GetInt64());
        Assert.Equal(1, measurement.GetProperty("typingStopBroadcast").GetInt64());
    }
}
