using System.Collections.Concurrent;
using Microsoft.AspNetCore.SignalR;

var builder = WebApplication.CreateBuilder(args);
var defaultOrigins = "http://localhost:3000;http://127.0.0.1:3000;http://127.0.0.1:5500";
var allowedOrigins = (builder.Configuration["CHAT_ALLOWED_ORIGINS"] ?? defaultOrigins)
    .Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
if (allowedOrigins.Length == 0)
{
    allowedOrigins = defaultOrigins.Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
}

builder.Services.AddSignalR();
builder.Services.AddSingleton<TypingAdaptationService>();
builder.Services.AddCors(options =>
{
    options.AddPolicy("ChatClients", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

var app = builder.Build();
app.UseCors("ChatClients");
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));
app.MapGet("/lnasf/metrics", (TypingAdaptationService adaptation) => Results.Ok(adaptation.GetSnapshot()));
app.MapHub<ChatHub>("/chat");
app.Run();

public class ChatHub : Hub
{
    private static readonly ConcurrentDictionary<string, string> Users = new();
    private readonly TypingAdaptationService _typingAdaptation;

    public ChatHub(TypingAdaptationService typingAdaptation) => _typingAdaptation = typingAdaptation;

    public override async Task OnConnectedAsync()
    {
        Console.WriteLine("SignalR client connected.");
        await base.OnConnectedAsync();
    }

    public async Task UserJoin(string rawUsername)
    {
        var username = ChatValidation.NormalizeUsername(rawUsername);
        var isKnownConnection = Users.TryGetValue(Context.ConnectionId, out var previousUsername);

        Users[Context.ConnectionId] = username;
        if (isKnownConnection && previousUsername == username)
        {
            await Clients.Caller.SendAsync("welcome", new
            {
                message = $"Welcome back to the chatroom, {username}!",
                users = GetOnlineUsers()
            });
            return;
        }

        if (isKnownConnection && previousUsername is not null)
        {
            await Clients.Others.SendAsync("user-left", new
            {
                username = previousUsername,
                message = $"{previousUsername} left the chat",
                time = DateTimeOffset.UtcNow.ToString("O")
            });
        }

        await Clients.Others.SendAsync("user-joined", new
        {
            username,
            message = $"{username} joined the chat",
            time = DateTimeOffset.UtcNow.ToString("O")
        });

        await Clients.Caller.SendAsync("welcome", new
        {
            message = $"Welcome to the chatroom, {username}!",
            users = GetOnlineUsers()
        });
        await Clients.All.SendAsync("online-users", GetOnlineUsers());
    }

    public async Task SendMessage(string rawMessage)
    {
        if (!Users.TryGetValue(Context.ConnectionId, out var username))
        {
            throw new HubException("Join the chat before sending messages.");
        }

        var message = ChatValidation.NormalizeMessage(rawMessage);
        await Clients.All.SendAsync("new-message", new
        {
            username,
            message,
            time = DateTimeOffset.UtcNow.ToString("O"),
            id = Guid.NewGuid().ToString("N")
        });
    }

    public Task TypingStart()
    {
        if (!Users.TryGetValue(Context.ConnectionId, out var username)) return Task.CompletedTask;
        var decision = _typingAdaptation.HandleStart(Context.ConnectionId, DateTimeOffset.UtcNow);
        return decision.Broadcast
            ? Clients.Others.SendAsync("user-typing", new { username, isTyping = true })
            : Task.CompletedTask;
    }

    public Task TypingStop()
    {
        if (!Users.TryGetValue(Context.ConnectionId, out var username)) return Task.CompletedTask;
        _typingAdaptation.HandleStop(Context.ConnectionId);
        return Clients.Others.SendAsync("user-typing", new { username, isTyping = false });
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _typingAdaptation.Remove(Context.ConnectionId);
        if (Users.TryRemove(Context.ConnectionId, out var username))
        {
            await Clients.All.SendAsync("user-left", new
            {
                username,
                message = $"{username} left the chat",
                time = DateTimeOffset.UtcNow.ToString("O")
            });
            await Clients.All.SendAsync("online-users", GetOnlineUsers());
        }

        await base.OnDisconnectedAsync(exception);
    }

    private static string[] GetOnlineUsers() =>
        Users.Values.OrderBy(name => name, StringComparer.OrdinalIgnoreCase).ToArray();
}

public static class ChatValidation
{
    public const int MaxUsernameLength = 32;
    public const int MaxMessageLength = 2000;

    public static string NormalizeUsername(string? value)
    {
        var username = value?.Trim();
        if (string.IsNullOrWhiteSpace(username) ||
            username.Length > MaxUsernameLength ||
            username.Any(char.IsControl))
        {
            throw new HubException($"Display names must contain 1 to {MaxUsernameLength} visible characters.");
        }

        return username;
    }

    public static string NormalizeMessage(string? value)
    {
        var message = value?.Trim();
        if (string.IsNullOrWhiteSpace(message) ||
            message.Length > MaxMessageLength ||
            message.Any(character => char.IsControl(character) && character != '\r' && character != '\n' && character != '\t'))
        {
            throw new HubException($"Messages must contain 1 to {MaxMessageLength} visible characters.");
        }

        return message;
    }
}
