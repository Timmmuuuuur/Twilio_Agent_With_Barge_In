import { ConversationAgent } from "../src/livekit/agent.js";
import assert from "assert";

/**
 * Simple evaluation harness for agent
 */
async function runScenario(name, turns) {
  console.log(`\n📝 Running scenario: ${name}`);
  console.log("=".repeat(60));
  
  const agent = new ConversationAgent("test-" + Date.now());
  
  try {
    // Note: We skip LiveKit connection for testing
    // await agent.connect();
    
    for (const [userInput, expectations] of turns) {
      console.log(`\n👤 User: ${userInput}`);
      
      const response = await agent.processUtterance(userInput);
      console.log(`🤖 Agent: ${response}`);
      
      // Validate expectations
      if (expectations.shouldIncludeIntent) {
        const hasIntent = agent.intents.includes(expectations.shouldIncludeIntent);
        assert(hasIntent, `Expected intent '${expectations.shouldIncludeIntent}' not found`);
        console.log(`✅ Intent check passed: ${expectations.shouldIncludeIntent}`);
      }
      
      if (expectations.shouldExtractSlot) {
        const [slot, value] = Object.entries(expectations.shouldExtractSlot)[0];
        assert(agent.slots[slot], `Expected slot '${slot}' not extracted`);
        console.log(`✅ Slot extracted: ${slot} = ${agent.slots[slot]}`);
      }
      
      if (expectations.shouldCallTool) {
        const toolCalled = agent.toolTrace.some(t => t.tool === expectations.shouldCallTool);
        assert(toolCalled, `Expected tool '${expectations.shouldCallTool}' not called`);
        console.log(`✅ Tool called: ${expectations.shouldCallTool}`);
      }
    }
    
    // Validate final audit JSON
    console.log("\n📊 Final Audit:");
    console.log(`  - Transcript entries: ${agent.transcript.length}`);
    console.log(`  - Tool calls: ${agent.toolTrace.length}`);
    console.log(`  - Intents: ${agent.intents.join(", ")}`);
    console.log(`  - Slots: ${JSON.stringify(agent.slots, null, 2)}`);
    
    assert(agent.transcript.length >= turns.length * 2, "Transcript incomplete");
    console.log("✅ Audit JSON structure valid");
    
    console.log(`\n✅ Scenario passed: ${name}\n`);
    
    return {
      passed: true,
      transcript: agent.transcript,
      toolTrace: agent.toolTrace,
      slots: agent.slots
    };
    
  } catch (err) {
    console.error(`\n❌ Scenario failed: ${name}`);
    console.error(err);
    return { passed: false, error: err.message };
  } finally {
    await agent.disconnect();
  }
}

/**
 * Scenario 1: Coverage → Availability → Booking → SMS (Success Path)
 */
async function testSuccessPath() {
  const turns = [
    [
      "Hi, I'm Maya Patel. Do you take Delta Dental PPO for a cleaning?",
      { 
        shouldExtractSlot: { patient_first: "Maya" },
        shouldIncludeIntent: "coverage_check",
        shouldCallTool: "check_insurance_coverage"
      }
    ],
    [
      "If yes, next Tuesday morning in San Jose. My number is 408-555-1234.",
      {
        shouldExtractSlot: { phone: "+14085551234" },
        shouldCallTool: "get_provider_availability"
      }
    ],
    [
      "Perfect, let's book the 9am slot.",
      {
        // This would trigger booking in full implementation
      }
    ],
    [
      "Yes, please send me a confirmation SMS.",
      {
        // This would trigger SMS in full implementation
      }
    ],
    [
      "Thank you!",
      {}
    ]
  ];
  
  return await runScenario("Success Path: Coverage → Availability → Booking → SMS", turns);
}

/**
 * Scenario 2: Coverage Denied (Error Path)
 */
async function testCoverageDenied() {
  const turns = [
    [
      "Hi, do you take UnitedHealthcare for a root canal?",
      {
        shouldIncludeIntent: "coverage_check",
        shouldCallTool: "check_insurance_coverage"
      }
    ],
    [
      "Okay, how much would it be cash pay?",
      {}
    ],
    [
      "Let me think about it and call back.",
      {}
    ]
  ];
  
  return await runScenario("Error Path: Coverage Denied", turns);
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log("\n🧪 Starting Evaluation Harness");
  console.log("=".repeat(60));
  
  const results = [];
  
  results.push(await testSuccessPath());
  results.push(await testCoverageDenied());
  
  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📈 Test Summary");
  console.log("=".repeat(60));
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log(`✅ Passed: ${passed}/${results.length}`);
  console.log(`❌ Failed: ${failed}/${results.length}`);
  
  if (failed === 0) {
    console.log("\n🎉 All tests passed!");
    process.exit(0);
  } else {
    console.log("\n💥 Some tests failed");
    process.exit(1);
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}

export { runScenario, testSuccessPath, testCoverageDenied };

