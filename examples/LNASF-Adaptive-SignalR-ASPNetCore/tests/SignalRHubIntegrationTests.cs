using System.Collections.Concurrent;
using System.Diagnostics;
using System.Net;
using System.Net.Sockets;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using Xunit;

public class SignalRHubIntegrationTests
{
    [Fact]
    public async Task AdaptiveTypingSuppressionPreservesTypingStopAndPrimaryMessagesOverLiveHub()
    {
        var repositoryRoot = FindRepositoryRoot();
        var port = GetAvailablePort();
        var baseUrl = $"http://127.0.0.1:{port}";
        using var server = StartServer(repositoryRoot, port);
        using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(2) };

        try
        {
            await WaitForHealthAsync(http, server, baseUrl, TimeSpan.FromSeconds(20));

            await using var first = await SignalRWebSocketClient.ConnectAsync(baseUrl);
            await using var second = await SignalRWebSocketClient.ConnectAsync(baseUrl);

            await first.InvokeAsync("UserJoin", "Ada");
            await first.WaitForEventAsync("welcome");

            await second.InvokeAsync("UserJoin", "Ben");
            await second.WaitForEventAsync("welcome");

            const int burstSize = 12;
            for (var index = 0; index < burstSize; index++)
            {
                await first.InvokeAsync("TypingStart");
            }

            var stopReceived = second.WaitForEventAsync(
                "user-typing",
                arguments => arguments.ValueKind == JsonValueKind.Array && arguments.GetArrayLength() > 0 &&
                    arguments[0].TryGetProperty("isTyping", out var isTyping) &&
                    isTyping.ValueKind == JsonValueKind.False);
            await first.InvokeAsync("TypingStop");
            await stopReceived;

            const string chatText = "The primary chat path must remain deterministic.";
            var messageReceived = second.WaitForEventAsync(
                "new-message",
                arguments => arguments.ValueKind == JsonValueKind.Array && arguments.GetArrayLength() > 0 &&
                    arguments[0].TryGetProperty("message", out var message) &&
                    message.GetString() == chatText);
            await first.InvokeAsync("SendMessage", chatText);
            var messageArguments = await messageReceived;

            using var metricsResponse = await http.GetAsync($"{baseUrl}/lnasf/metrics");
            metricsResponse.EnsureSuccessStatusCode();
            using var metricsDocument = JsonDocument.Parse(await metricsResponse.Content.ReadAsStringAsync());
            var root = metricsDocument.RootElement;
            Assert.Equal("adaptive", root.GetProperty("mode").GetString());

            var measurement = root.GetProperty("measurement");
            Assert.Equal(burstSize, measurement.GetProperty("typingStartReceived").GetInt64());
            Assert.True(measurement.GetProperty("typingStartSuppressed").GetInt64() > 0);
            Assert.True(measurement.GetProperty("typingStartBroadcast").GetInt64() < burstSize);
            Assert.Equal(1, measurement.GetProperty("typingStopBroadcast").GetInt64());

            var message = messageArguments[0];
            Assert.Equal("Ada", message.GetProperty("username").GetString());
            Assert.Equal(chatText, message.GetProperty("message").GetString());
            Assert.False(string.IsNullOrWhiteSpace(message.GetProperty("id").GetString()));
        }
        finally
        {
            if (!server.Process.HasExited)
            {
                server.Process.Kill(entireProcessTree: true);
                await server.Process.WaitForExitAsync();
            }
        }
    }

    private static ServerHost StartServer(string repositoryRoot, int port)
    {
        var startInfo = new ProcessStartInfo("dotnet")
        {
            WorkingDirectory = repositoryRoot,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true
        };
        startInfo.ArgumentList.Add(Path.Combine(repositoryRoot, "src", "bin", "Release", "net8.0", "src.dll"));
        startInfo.Environment["ASPNETCORE_URLS"] = $"http://127.0.0.1:{port}";
        startInfo.Environment["LNASF_MODE"] = "adaptive";
        startInfo.Environment["CHAT_ALLOWED_ORIGINS"] = "http://localhost:3000";
        startInfo.Environment["DOTNET_NOLOGO"] = "true";

        var process = Process.Start(startInfo)
            ?? throw new InvalidOperationException("Could not start the ASP.NET Core SignalR test server.");
        var diagnostics = new StringBuilder();
        process.OutputDataReceived += (_, eventArgs) =>
        {
            if (eventArgs.Data is not null) lock (diagnostics) diagnostics.AppendLine(eventArgs.Data);
        };
        process.ErrorDataReceived += (_, eventArgs) =>
        {
            if (eventArgs.Data is not null) lock (diagnostics) diagnostics.AppendLine(eventArgs.Data);
        };
        process.BeginOutputReadLine();
        process.BeginErrorReadLine();
        return new ServerHost(process, diagnostics);
    }

    private static async Task WaitForHealthAsync(
        HttpClient http,
        ServerHost server,
        string baseUrl,
        TimeSpan timeout)
    {
        var timer = Stopwatch.StartNew();
        Exception? lastError = null;
        while (timer.Elapsed < timeout)
        {
            if (server.Process.HasExited)
            {
                throw new InvalidOperationException(
                    $"The SignalR test server exited early with code {server.Process.ExitCode}. {server.GetDiagnostics()}");
            }

            try
            {
                using var response = await http.GetAsync($"{baseUrl}/health");
                if (response.IsSuccessStatusCode) return;
            }
            catch (HttpRequestException error)
            {
                lastError = error;
            }
            catch (TaskCanceledException error)
            {
                lastError = error;
            }

            await Task.Delay(100);
        }

        throw new TimeoutException(
            $"The SignalR test server did not become healthy in time. {server.GetDiagnostics()}",
            lastError);
    }

    private static int GetAvailablePort()
    {
        using var listener = new TcpListener(IPAddress.Loopback, 0);
        listener.Start();
        return ((IPEndPoint)listener.LocalEndpoint).Port;
    }

    private static string FindRepositoryRoot()
    {
        foreach (var start in new[] { Environment.CurrentDirectory, AppContext.BaseDirectory })
        {
            var current = new DirectoryInfo(start);
            while (current is not null)
            {
                if (File.Exists(Path.Combine(current.FullName, "signalr-aspnetcore-public-chatroom.sln")))
                    return current.FullName;
                current = current.Parent;
            }
        }

        throw new DirectoryNotFoundException("Could not locate the SignalR repository root for the integration test.");
    }

    private sealed class ServerHost : IDisposable
    {
        private readonly StringBuilder _diagnostics;

        public ServerHost(Process process, StringBuilder diagnostics)
        {
            Process = process;
            _diagnostics = diagnostics;
        }

        public Process Process { get; }

        public string GetDiagnostics()
        {
            lock (_diagnostics) return _diagnostics.ToString();
        }

        public void Dispose() => Process.Dispose();
    }

    private sealed record HubEvent(string Target, JsonElement Arguments);

    private sealed class EventWaiter
    {
        public required string Target { get; init; }
        public required Func<JsonElement, bool> Predicate { get; init; }
        public required TaskCompletionSource<JsonElement> Completion { get; init; }
    }

    private sealed class SignalRWebSocketClient : IAsyncDisposable
    {
        private readonly ClientWebSocket _socket = new();
        private readonly CancellationTokenSource _stop = new();
        private readonly object _sync = new();
        private readonly List<HubEvent> _events = new();
        private readonly List<EventWaiter> _eventWaiters = new();
        private readonly ConcurrentDictionary<string, TaskCompletionSource<bool>> _invocations = new();
        private Task? _reader;
        private string _initialText = string.Empty;
        private long _invocationId;

        private SignalRWebSocketClient() { }

        public static async Task<SignalRWebSocketClient> ConnectAsync(string baseUrl)
        {
            using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(5) };
            using var negotiateResponse = await http.PostAsync(
                $"{baseUrl.TrimEnd('/')}/chat/negotiate?negotiateVersion=1",
                new StringContent(string.Empty, Encoding.UTF8, "text/plain"));
            negotiateResponse.EnsureSuccessStatusCode();

            using var negotiateJson = JsonDocument.Parse(
                await negotiateResponse.Content.ReadAsStringAsync());
            var token = negotiateJson.RootElement.GetProperty("connectionToken").GetString();
            if (string.IsNullOrWhiteSpace(token))
                throw new InvalidOperationException("SignalR negotiate response did not contain connectionToken.");

            var client = new SignalRWebSocketClient();
            var socketUrl = new Uri(
                $"{baseUrl.Replace("http://", "ws://", StringComparison.Ordinal)}/chat?id={Uri.EscapeDataString(token)}");
            await client._socket.ConnectAsync(socketUrl, CancellationToken.None);
            var handshakeBytes = Encoding.UTF8.GetBytes("{\"protocol\":\"json\",\"version\":1}\u001e");
            await client._socket.SendAsync(
                handshakeBytes, WebSocketMessageType.Text, true, CancellationToken.None);

            var handshake = await client.ReadHandshakeAsync();
            if (handshake != "{}")
                throw new InvalidOperationException($"Unexpected SignalR handshake response: {handshake}");

            client._reader = client.ReadLoopAsync();
            return client;
        }

        public async Task InvokeAsync(string target, params object?[] arguments)
        {
            var id = Interlocked.Increment(ref _invocationId).ToString();
            var completion = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
            if (!_invocations.TryAdd(id, completion))
                throw new InvalidOperationException("Could not register SignalR invocation.");

            try
            {
                var json = JsonSerializer.Serialize(new
                {
                    type = 1,
                    invocationId = id,
                    target,
                    arguments
                }) + "\u001e";
                var bytes = Encoding.UTF8.GetBytes(json);
                await _socket.SendAsync(bytes, WebSocketMessageType.Text, true, _stop.Token);
                await completion.Task.WaitAsync(TimeSpan.FromSeconds(5));
            }
            finally
            {
                _invocations.TryRemove(id, out _);
            }
        }

        public Task<JsonElement> WaitForEventAsync(
            string target,
            Func<JsonElement, bool>? predicate = null,
            TimeSpan? timeout = null)
        {
            predicate ??= _ => true;
            lock (_sync)
            {
                var index = _events.FindIndex(item => item.Target == target && predicate(item.Arguments));
                if (index >= 0)
                {
                    var item = _events[index];
                    _events.RemoveAt(index);
                    return Task.FromResult(item.Arguments);
                }

                var source = new TaskCompletionSource<JsonElement>(TaskCreationOptions.RunContinuationsAsynchronously);
                var waiter = new EventWaiter { Target = target, Predicate = predicate, Completion = source };
                _eventWaiters.Add(waiter);
                return WaitForEventCompletionAsync(waiter, timeout ?? TimeSpan.FromSeconds(5));
            }
        }

        private async Task<JsonElement> WaitForEventCompletionAsync(EventWaiter waiter, TimeSpan timeout)
        {
            try
            {
                return await waiter.Completion.Task.WaitAsync(timeout);
            }
            catch
            {
                lock (_sync) _eventWaiters.Remove(waiter);
                throw;
            }
        }

        private async Task<string> ReadHandshakeAsync()
        {
            var buffer = new byte[8192];
            var text = new StringBuilder();
            while (true)
            {
                var result = await _socket.ReceiveAsync(
                    new ArraySegment<byte>(buffer), CancellationToken.None);
                if (result.MessageType == WebSocketMessageType.Close)
                    throw new WebSocketException("The SignalR server closed before completing the handshake.");

                text.Append(Encoding.UTF8.GetString(buffer, 0, result.Count));
                var combined = text.ToString();
                var boundary = combined.IndexOf('\u001e');
                if (boundary < 0) continue;

                _initialText = combined[(boundary + 1)..];
                return combined[..boundary];
            }
        }

        private async Task ReadLoopAsync()
        {
            var buffer = new byte[8192];
            var pending = new StringBuilder(_initialText);
            try
            {
                while (!_stop.IsCancellationRequested && _socket.State == WebSocketState.Open)
                {
                    var result = await _socket.ReceiveAsync(
                        new ArraySegment<byte>(buffer), _stop.Token);
                    if (result.MessageType == WebSocketMessageType.Close) break;
                    pending.Append(Encoding.UTF8.GetString(buffer, 0, result.Count));

                    var combined = pending.ToString();
                    var boundary = combined.IndexOf('\u001e');
                    while (boundary >= 0)
                    {
                        var packet = combined[..boundary];
                        combined = combined[(boundary + 1)..];
                        ProcessPacket(packet);
                        boundary = combined.IndexOf('\u001e');
                    }

                    pending.Clear();
                    pending.Append(combined);
                }
            }
            catch (OperationCanceledException) when (_stop.IsCancellationRequested)
            {
                // Normal disposal path.
            }
            catch (WebSocketException) when (_stop.IsCancellationRequested)
            {
                // Normal disposal path.
            }
            catch (Exception error)
            {
                foreach (var invocation in _invocations.Values) invocation.TrySetException(error);
                lock (_sync)
                {
                    foreach (var waiter in _eventWaiters) waiter.Completion.TrySetException(error);
                    _eventWaiters.Clear();
                }
            }
        }

        private void ProcessPacket(string packet)
        {
            if (string.IsNullOrWhiteSpace(packet) || packet == "{}") return;
            using var document = JsonDocument.Parse(packet);
            var root = document.RootElement;
            if (!root.TryGetProperty("type", out var typeElement)) return;

            var type = typeElement.GetInt32();
            if (type == 1 &&
                root.TryGetProperty("target", out var targetElement) &&
                targetElement.GetString() is { } target &&
                root.TryGetProperty("arguments", out var arguments))
            {
                PublishEvent(new HubEvent(target, arguments.Clone()));
            }
            else if (type == 3 &&
                root.TryGetProperty("invocationId", out var idElement) &&
                idElement.GetString() is { } id &&
                _invocations.TryGetValue(id, out var completion))
            {
                if (root.TryGetProperty("error", out var errorElement))
                    completion.TrySetException(new InvalidOperationException($"SignalR hub invocation failed: {errorElement.GetString()}"));
                else
                    completion.TrySetResult(true);
            }
            else if (type == 7)
            {
                var error = root.TryGetProperty("error", out var closeError)
                    ? closeError.GetString()
                    : "SignalR server closed the connection.";
                throw new InvalidOperationException(error);
            }
        }

        private void PublishEvent(HubEvent item)
        {
            lock (_sync)
            {
                var index = _eventWaiters.FindIndex(
                    waiter => waiter.Target == item.Target && waiter.Predicate(item.Arguments));
                if (index >= 0)
                {
                    var waiter = _eventWaiters[index];
                    _eventWaiters.RemoveAt(index);
                    waiter.Completion.TrySetResult(item.Arguments);
                    return;
                }
                _events.Add(item);
            }
        }

        public async ValueTask DisposeAsync()
        {
            _stop.Cancel();
            try { _socket.Abort(); } catch { }
            _socket.Dispose();
            if (_reader is not null)
            {
                try { await _reader; } catch { }
            }
            _stop.Dispose();
        }
    }
}
