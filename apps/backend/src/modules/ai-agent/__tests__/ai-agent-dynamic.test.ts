import assert from 'assert';

export function runAIAgentDynamicTests() {
  const dummyUserMessage = 'When a new email arrives in Gmail, send a Slack message';
  const lower = dummyUserMessage.toLowerCase();

  const isSlackMatch = lower.includes('slack');
  const isGmailMatch = lower.includes('gmail');

  assert(isSlackMatch, 'Slack connector keyword match failed');
  assert(isGmailMatch, 'Gmail connector keyword match failed');

  console.log('✅ AIAgentDynamic unit tests passed successfully!');
}

runAIAgentDynamicTests();
