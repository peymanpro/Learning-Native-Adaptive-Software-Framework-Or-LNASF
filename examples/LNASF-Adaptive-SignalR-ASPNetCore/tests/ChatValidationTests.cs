using Microsoft.AspNetCore.SignalR;
using Xunit;

public class ChatValidationTests
{
    [Theory]
    [InlineData("  Ada  ", "Ada")]
    [InlineData("پیمان", "پیمان")]
    public void NormalizeUsername_TrimsValidDisplayNames(string input, string expected)
    {
        Assert.Equal(expected, ChatValidation.NormalizeUsername(input));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("line\nbreak")]
    public void NormalizeUsername_RejectsInvalidDisplayNames(string input)
    {
        Assert.Throws<HubException>(() => ChatValidation.NormalizeUsername(input));
    }

    [Fact]
    public void NormalizeUsername_RejectsValuesLongerThanLimit()
    {
        Assert.Throws<HubException>(() => ChatValidation.NormalizeUsername(new string('x', 33)));
    }

    [Fact]
    public void NormalizeMessage_TrimsAcceptedContent()
    {
        Assert.Equal("hello", ChatValidation.NormalizeMessage("  hello  "));
    }

    [Fact]
    public void NormalizeMessage_AllowsMultilineChatText()
    {
        Assert.Equal("first line\nsecond line", ChatValidation.NormalizeMessage(" first line\nsecond line "));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("bad\u0001value")]
    public void NormalizeMessage_RejectsEmptyAndUnsafeControlCharacters(string input)
    {
        Assert.Throws<HubException>(() => ChatValidation.NormalizeMessage(input));
    }

    [Fact]
    public void NormalizeMessage_RejectsValuesLongerThanLimit()
    {
        Assert.Throws<HubException>(() => ChatValidation.NormalizeMessage(new string('x', 2001)));
    }
}
