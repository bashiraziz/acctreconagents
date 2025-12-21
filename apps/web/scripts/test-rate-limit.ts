/**
 * Test rate limiting for anonymous users
 * Tests that after 5 reconciliations in 1 hour, the 6th is blocked
 */

async function testRateLimit() {
  const BASE_URL = 'http://localhost:3100';

  console.log('🧪 Testing Rate Limiting for Anonymous Users\n');
  console.log('Expected: 5 allowed per hour, 6th should be blocked\n');

  // Check initial rate limit status
  console.log('1. Checking initial rate limit status...');
  const initialStatus = await fetch(`${BASE_URL}/api/rate-limit`);
  const initialData = await initialStatus.json();
  console.log(`   Remaining: ${initialData.remaining}/${initialData.limit}`);
  console.log(`   Window: ${initialData.window}\n`);

  // Make 6 reconciliation attempts
  for (let i = 1; i <= 6; i++) {
    console.log(`${i}. Attempting reconciliation #${i}...`);

    const response = await fetch(`${BASE_URL}/api/agent/runs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userPrompt: `Test reconciliation #${i}`,
        payload: {
          gl_data: [
            {
              account: '1000',
              account_name: 'Cash',
              period: '2024-01',
              balance: 10000
            }
          ],
          subledger_data: [
            {
              account: '1000',
              period: '2024-01',
              balance: 10000
            }
          ]
        }
      })
    });

    if (response.status === 429) {
      console.log(`   ❌ BLOCKED (429 Too Many Requests) - Rate limit working!\n`);

      // Get updated status
      const statusAfter = await fetch(`${BASE_URL}/api/rate-limit`);
      const statusData = await statusAfter.json();
      console.log(`   Final status: ${statusData.remaining}/${statusData.limit} remaining`);
      console.log(`   Reset in: ${Math.ceil(statusData.reset / 60000)} minutes\n`);

      console.log('✅ Rate limiting test PASSED!');
      console.log(`   - First ${i-1} requests allowed`);
      console.log(`   - Request #${i} blocked as expected`);
      return;
    } else if (!response.ok) {
      console.log(`   ⚠️  Request failed with status ${response.status}`);
      const error = await response.text();
      console.log(`   Error: ${error}\n`);
    } else {
      console.log(`   ✅ Allowed (${response.status})\n`);
    }

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n❌ Rate limiting test FAILED!');
  console.log('   All 6 requests were allowed - rate limit not working');
}

testRateLimit().catch(error => {
  console.error('\n❌ Test error:', error.message);
  process.exit(1);
});
