import { BaseConnector } from '../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../core/types';
import { ConnectorManifest } from '@automation/shared-types';

export class ConditionConnector extends BaseConnector {
  manifest: ConnectorManifest = {
    id: 'autoflow-condition',
    name: 'If / Else Logic Condition',
    description: 'Split workflow execution paths into TRUE and FALSE branches based on rules.',
    category: 'Logic & Control Flow',
    icon: '/icons/condition.svg',
    authType: 'none',
    triggers: [],
    actions: [
      {
        id: 'if_else',
        name: 'If / Else Rule Evaluation',
        description: 'Evaluates dynamic variable rules and triggers TRUE or FALSE branch.',
        type: 'action',
        inputs: [
          { key: 'leftValue', label: 'Value to Test (Token)', type: 'string', required: true },
          { key: 'operator', label: 'Comparison Operator', type: 'string', required: true },
          { key: 'rightValue', label: 'Target Value', type: 'string', required: false },
        ],
        outputs: [
          { key: 'conditionMet', label: 'Condition Met (Boolean)', type: 'boolean', required: true },
          { key: 'matchedBranch', label: 'Matched Branch (true/false)', type: 'string', required: true },
          { key: 'result', label: 'Result Summary', type: 'string', required: true },
        ],
      },
      {
        id: 'filter',
        name: 'Filter Array Items',
        description: 'Filters array elements matching criteria.',
        type: 'action',
        inputs: [
          { key: 'arrayData', label: 'Input Array', type: 'json', required: true },
          { key: 'operator', label: 'Filter Operator', type: 'string', required: true },
          { key: 'matchValue', label: 'Match Keyword', type: 'string', required: true },
        ],
        outputs: [
          { key: 'filteredItems', label: 'Filtered Array', type: 'json', required: true },
          { key: 'count', label: 'Filtered Count', type: 'number', required: true },
        ],
      },
    ],
  };

  async executeAction(actionId: string, context: ExecutionContext): Promise<ConnectorExecutionOutput> {
    const input = context.stepInput || {};

    if (actionId === 'filter') {
      const arr = Array.isArray(input.arrayData) ? input.arrayData : [];
      const matchVal = String(input.matchValue || '').toLowerCase();
      const filtered = arr.filter((item: any) => {
        const str = JSON.stringify(item).toLowerCase();
        return str.includes(matchVal);
      });
      return {
        success: true,
        data: {
          filteredItems: filtered,
          count: filtered.length,
          result: `Filtered ${filtered.length} of ${arr.length} items`,
        },
      };
    }

    // Default 'if_else' evaluation
    const leftRaw = input.leftValue ?? input.left ?? '';
    const rightRaw = input.rightValue ?? input.right ?? '';
    const operator = (input.operator || 'contains').toLowerCase();

    const leftStr = String(leftRaw).toLowerCase();
    const rightStr = String(rightRaw).toLowerCase();

    let conditionMet = false;

    switch (operator) {
      case 'contains':
      case 'includes':
        conditionMet = leftStr.includes(rightStr);
        break;
      case 'equals':
      case '===':
      case '==':
        conditionMet = leftStr === rightStr;
        break;
      case 'not_equals':
      case '!=':
      case '!==':
        conditionMet = leftStr !== rightStr;
        break;
      case 'greater_than':
      case '>':
        conditionMet = Number(leftRaw) > Number(rightRaw);
        break;
      case 'less_than':
      case '<':
        conditionMet = Number(leftRaw) < Number(rightRaw);
        break;
      case 'is_empty':
        conditionMet = !leftRaw || leftRaw === '' || (Array.isArray(leftRaw) && leftRaw.length === 0);
        break;
      case 'is_not_empty':
        conditionMet = Boolean(leftRaw) && (!Array.isArray(leftRaw) || leftRaw.length > 0);
        break;
      default:
        conditionMet = leftStr.includes(rightStr);
        break;
    }

    const matchedBranch = conditionMet ? 'true' : 'false';

    return {
      success: true,
      data: {
        conditionMet,
        matchedBranch,
        leftValue: leftRaw,
        operator,
        rightValue: rightRaw,
        result: conditionMet
          ? `TRUE Branch Matched: "${leftRaw}" ${operator} "${rightRaw}"`
          : `FALSE Branch Matched: "${leftRaw}" ${operator} "${rightRaw}"`,
      },
    };
  }
}
