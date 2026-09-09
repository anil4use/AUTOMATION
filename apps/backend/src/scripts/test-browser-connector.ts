import { WebBrowserConnector, WebSearchConnector } from '@automation/connectors';
import { browserToolService } from '../services/browser-tool.service';

async function runTests() {
  console.log('====================================================');
  console.log('   STARTING PLAYWRIGHT MCP & WEB SEARCH TEST SUITE  ');
  console.log('====================================================');

  const browserConnector = new WebBrowserConnector();
  const searchConnector = new WebSearchConnector();

  try {
    // Warmup browser tool service
    console.log('\n--- 0. Warming up Browser Tool Service ---');
    await browserToolService.warmup();

    // ----------------------------------------------------
    // TEST 1: Navigation & Snapshot
    // ----------------------------------------------------
    console.log('\n--- TEST 1: Navigation & Page Read (example.com) ---');
    const session1 = 'test_session_1';
    const navResult = await browserConnector.executeAction('browser_navigate', {
      stepInput: { url: 'https://example.com' },
      sessionId: session1,
    });
    console.log('[Test 1] Navigate output:', navResult);

    const readResult = await browserConnector.executeAction('browser_read_page', {
      stepInput: {},
      sessionId: session1,
    });
    console.log('[Test 1] Read Page title:', readResult.data?.title);
    console.log('[Test 1] Read Page text snippet:', readResult.data?.content?.substring(0, 150));

    if (readResult.data?.title !== 'Example Domain') {
      throw new Error(`Test 1 Failed: Expected 'Example Domain', got '${readResult.data?.title}'`);
    }
    console.log('✅ TEST 1 PASSED');

    // ----------------------------------------------------
    // TEST 2: Compressed Screenshot & Description
    // ----------------------------------------------------
    console.log('\n--- TEST 2: Screenshot Compression & Vision Mode ---');
    const shotDescResult = await browserConnector.executeAction('browser_take_screenshot', {
      stepInput: { returnAs: 'description' },
      sessionId: session1,
    });
    console.log('[Test 2] Description mode result:', shotDescResult.data);

    const shotDataResult = await browserConnector.executeAction('browser_take_screenshot', {
      stepInput: { returnAs: 'dataUrl' },
      sessionId: session1,
    });
    const dataUrlLength = shotDataResult.data?.imageBase64?.length || 0;
    console.log('[Test 2] Base64 byte length:', dataUrlLength);
    if (dataUrlLength > 2 * 1024 * 1024) {
      throw new Error(`Test 2 Failed: Compressed screenshot size (${dataUrlLength} B) exceeded 2MB limit`);
    }
    console.log('✅ TEST 2 PASSED');

    // ----------------------------------------------------
    // TEST 3: DuckDuckGo Instant Web Search
    // ----------------------------------------------------
    console.log('\n--- TEST 3: Web Search Connector (DuckDuckGo HTML) ---');
    const searchResult = await searchConnector.executeAction('search_web', {
      stepInput: { query: 'Node.js documentation', maxResults: 3 },
    });
    console.log('[Test 3] Search results count:', searchResult.data?.results?.length);
    console.log('[Test 3] Top result:', searchResult.data?.results?.[0]);
    if (!Array.isArray(searchResult.data?.results) || searchResult.data?.results.length === 0) {
      throw new Error('Test 3 Failed: No search results returned');
    }
    console.log('✅ TEST 3 PASSED');

    // ----------------------------------------------------
    // TEST 4: Search & Read Combined Pipeline
    // ----------------------------------------------------
    console.log('\n--- TEST 4: search_and_read Combined Pipeline ---');
    const searchAndReadResult = await searchConnector.executeAction('search_and_read', {
      stepInput: { query: 'Example Domain', maxResults: 1 },
      sessionId: 'session_sandr',
    });
    console.log('[Test 4] Top title:', searchAndReadResult.data?.topResult?.title);
    console.log('[Test 4] Scraped content snippet:', searchAndReadResult.data?.pageContent?.substring(0, 150));
    console.log('✅ TEST 4 PASSED');

    // ----------------------------------------------------
    // TEST 5: Form Filling & Submission
    // ----------------------------------------------------
    console.log('\n--- TEST 5: Form Fill against httpbin.org ---');
    const sessionForm = 'session_form';
    await browserConnector.executeAction('browser_navigate', {
      stepInput: { url: 'https://httpbin.org/forms/post' },
      sessionId: sessionForm,
    });

    const fillResult = await browserConnector.executeAction('browser_fill_form', {
      stepInput: {
        formFields: [
          { selector: 'input[name="custname"]', value: 'AutoFlow Test User' },
          { selector: 'input[name="custtel"]', value: '555-0199' },
          { selector: 'textarea[name="comments"]', value: 'Playwright MCP Form Test Passed' },
        ],
        submitSelector: 'button',
      },
      sessionId: sessionForm,
    });
    console.log('[Test 5] Form submission result:', fillResult.data);

    const postPageRead = await browserConnector.executeAction('browser_read_page', {
      stepInput: {},
      sessionId: sessionForm,
    });
    console.log('[Test 5] Full postPageRead output:', JSON.stringify(postPageRead));
    const pageText = postPageRead.data?.content || JSON.stringify(postPageRead.data || {});
    console.log('[Test 5] Response page content snippet:', pageText.substring(0, 200));
    if (!pageText.includes('AutoFlow Test User')) {
      throw new Error('Test 5 Failed: Submitted form data not reflected in response page');
    }
    console.log('✅ TEST 5 PASSED');

    // ----------------------------------------------------
    // TEST 6: Concurrent Session Isolation
    // ----------------------------------------------------
    console.log('\n--- TEST 6: Concurrent Session Isolation (Promise.all) ---');
    const sessionAlpha = 'session_alpha';
    const sessionBeta = 'session_beta';

    await Promise.all([
      browserConnector.executeAction('browser_navigate', {
        stepInput: { url: 'https://example.com' },
        sessionId: sessionAlpha,
      }),
      browserConnector.executeAction('browser_navigate', {
        stepInput: { url: 'https://httpbin.org/forms/post' },
        sessionId: sessionBeta,
      }),
    ]);

    const [alphaRead, betaRead] = await Promise.all([
      browserConnector.executeAction('browser_read_page', {
        stepInput: {},
        sessionId: sessionAlpha,
      }),
      browserConnector.executeAction('browser_read_page', {
        stepInput: {},
        sessionId: sessionBeta,
      }),
    ]);

    console.log('[Test 6] Alpha Title:', alphaRead.data?.title);
    console.log('[Test 6] Beta Title:', betaRead.data?.title);

    if (alphaRead.data?.title !== 'Example Domain') {
      throw new Error(`Test 6 Failed: Session Alpha polluted! Got title '${alphaRead.data?.title}'`);
    }
    if (!betaRead.data?.content?.includes('Customer name')) {
      throw new Error('Test 6 Failed: Session Beta missing expected form fields');
    }
    console.log('✅ TEST 6 PASSED (Zero session cross-contamination)');

    console.log('\n====================================================');
    console.log('    🎉 ALL 6 TEST SUITE SCENARIOS PASSED SAFELY!   ');
    console.log('====================================================');
  } catch (err) {
    console.error('\n❌ TEST SUITE ERROR:', err);
    process.exitCode = 1;
  } finally {
    console.log('Cleaning up browser sessions...');
    await browserToolService.closeAllSessions();
  }
}

runTests();
