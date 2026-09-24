import assert from 'assert';
import Handlebars from 'handlebars';

export function runPromptTemplateTests() {
  const template = 'Hello {{userName}}, your total is {{amount}} USD.';
  const compiled = Handlebars.compile(template);
  const result = compiled({ userName: 'Alice', amount: 100 });

  assert.strictEqual(result, 'Hello Alice, your total is 100 USD.', 'Handlebars template variable injection failed');

  const missingVarResult = compiled({ userName: 'Bob' });
  assert.strictEqual(missingVarResult, 'Hello Bob, your total is  USD.', 'Handlebars missing variable handling failed');

  console.log('✅ AIPromptTemplate unit tests passed successfully!');
}

runPromptTemplateTests();
