/**
 * @file Unit Tests for ParkingStore In-Memory Database & Business Logic
 * Covers:
 * - Zone initialization & spot counts
 * - Zone availability calculation (plenty, filling, full threshold calculations)
 * - Spot status transitions (free <-> occupied, battery, timestamp recording)
 * - Input validation & edge cases (unknown spot ID, malformed status)
 * - Event subscriber notification & broadcast payloads
 * - Simulator step execution & bias transitions
 */

import { ParkingStore } from '../server/store';

export function runParkingStoreTests(): { suite: string; passed: number; failed: number; tests: { name: string; passed: boolean; error?: string }[] } {
  const tests: { name: string; passed: boolean; error?: string }[] = [];
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, errorMsg?: string) {
    if (condition) {
      passed++;
      tests.push({ name: testName, passed: true });
    } else {
      failed++;
      tests.push({ name: testName, passed: false, error: errorMsg || 'Assertion failed' });
    }
  }

  // --- Suite: Initialization & Data Integrity ---
  {
    const store = new ParkingStore();
    // Stop simulator timer during unit tests
    store.setSimulatorConfig({ active: false });

    const zones = store.getAllZones();
    assert(zones.length === 4, 'Store initializes 4 campus parking zones', `Expected 4 zones, got ${zones.length}`);

    const allSpots = store.getAllSpots();
    assert(allSpots.length === 112, 'Store initializes all 112 campus parking spots across zones', `Expected 112 spots, got ${allSpots.length}`);

    const zoneA = store.getZoneDetail('zone-a');
    assert(zoneA !== null && zoneA.totalSpots === 32, 'Zone A (North Garage) contains exactly 32 spots');
    assert(zoneA !== null && zoneA.spots.length === 32, 'Zone A detail returns array of 32 spot objects');
  }

  // --- Suite: Threshold & Availability Calculations ---
  {
    const store = new ParkingStore();
    store.setSimulatorConfig({ active: false });

    // Test Zone A spots
    const zoneASpots = store.getAllSpots().filter((s) => s.zoneId === 'zone-a');
    
    // Set all spots to free: status should be 'plenty'
    for (const spot of zoneASpots) {
      store.updateSpot({ spotId: spot.id, status: 'free' });
    }
    let summary = store.calculateZoneSummary('zone-a')!;
    assert(summary.freeSpots === 32, 'All spots free yields 32 free spots');
    assert(summary.occupancyRate === 0, 'Occupancy rate is 0% when empty');
    assert(summary.status === 'plenty', 'Zone status is "plenty" when > 35% free');

    // Fill spots until free is between 12% and 35% (e.g., 25% free -> 8 free out of 32 -> 24 occupied)
    for (let i = 0; i < 24; i++) {
      store.updateSpot({ spotId: zoneASpots[i].id, status: 'occupied' });
    }
    summary = store.calculateZoneSummary('zone-a')!;
    assert(summary.freeSpots === 8, '8 free spots remaining');
    assert(summary.status === 'filling', 'Zone status transitions to "filling" when free spots are <= 35%');

    // Fill almost all spots (<= 12% free -> 3 or fewer free out of 32 -> occupy 30 spots -> 2 free = 6.25%)
    for (let i = 0; i < 30; i++) {
      store.updateSpot({ spotId: zoneASpots[i].id, status: 'occupied' });
    }
    summary = store.calculateZoneSummary('zone-a')!;
    assert(summary.freeSpots === 2, '2 free spots remaining');
    assert(summary.status === 'full', 'Zone status transitions to "full" when free spots are <= 12%');
  }

  // --- Suite: Spot State Transitions & Metadata Tracking ---
  {
    const store = new ParkingStore();
    store.setSimulatorConfig({ active: false });

    const targetSpot = store.getAllSpots()[0];
    const originalBattery = targetSpot.batteryLevel;

    // Transition to occupied with vehicle type and battery
    const updateResult = store.updateSpot({
      spotId: targetSpot.id,
      status: 'occupied',
      battery: 94,
      source: 'sensor',
      vehicleType: 'EV Sedan',
    });

    assert(updateResult.success === true, 'Valid spot update returns success: true');
    const updatedSpot = store.getSpotById(targetSpot.id)!;
    assert(updatedSpot.status === 'occupied', 'Spot status updated to "occupied"');
    assert(updatedSpot.batteryLevel === 94, 'Spot battery level successfully updated to 94%');
    assert(updatedSpot.occupiedVehicleType === 'EV Sedan', 'Occupied vehicle type correctly recorded');
    assert(typeof updatedSpot.occupiedSince === 'string', 'occupiedSince timestamp is populated');
    assert(typeof updatedSpot.lastStatusChange === 'string', 'lastStatusChange timestamp is updated');

    // Transition to free
    store.updateSpot({
      spotId: targetSpot.id,
      status: 'free',
      source: 'sensor',
    });
    const freedSpot = store.getSpotById(targetSpot.id)!;
    assert(freedSpot.status === 'free', 'Spot status transitioned back to "free"');
    assert(freedSpot.occupiedSince === undefined, 'occupiedSince is cleared when spot is freed');
    assert(freedSpot.occupiedVehicleType === undefined, 'occupiedVehicleType is cleared when freed');
  }

  // --- Suite: Unknown Spot & Edge Cases ---
  {
    const store = new ParkingStore();
    store.setSimulatorConfig({ active: false });

    const invalidUpdate = store.updateSpot({
      spotId: 'NON-EXISTENT-SPOT-999',
      status: 'occupied',
    });
    assert(invalidUpdate.success === false, 'Updating non-existent spot ID returns success: false');

    const invalidZone = store.calculateZoneSummary('invalid-zone-xyz');
    assert(invalidZone === null, 'Querying non-existent zone returns null');
  }

  // --- Suite: Event Broadcast & Subscriptions ---
  {
    const store = new ParkingStore();
    store.setSimulatorConfig({ active: false });

    let capturedEvent: any = null;
    const unsubscribe = store.subscribe((evt) => {
      capturedEvent = evt;
    });

    const spot = store.getAllSpots()[5];
    store.updateSpot({
      spotId: spot.id,
      status: 'occupied',
      source: 'camera',
    });

    assert(capturedEvent !== null, 'Subscriber receives event upon spot update');
    assert(capturedEvent?.type === 'SPOT_UPDATE', 'Event type is SPOT_UPDATE');
    assert(capturedEvent?.payload?.spot?.id === spot.id, 'Event payload contains updated spot ID');
    assert(capturedEvent?.payload?.source === 'camera', 'Event payload preserves event source');

    // Clean up
    unsubscribe();
    capturedEvent = null;
    store.updateSpot({ spotId: spot.id, status: 'free' });
    assert(capturedEvent === null, 'Unsubscribed listener does not receive subsequent events');
  }

  // --- Suite: Simulation Step Engine ---
  {
    const store = new ParkingStore();
    store.setSimulatorConfig({ active: false });

    const stepResult = store.triggerSimulatorStep('zone-b', 'arrive');
    assert(stepResult !== null && stepResult.success === true, 'triggerSimulatorStep successfully forces an arrival in Zone B');

    const departResult = store.triggerSimulatorStep('zone-b', 'depart');
    assert(departResult !== null && departResult.success === true, 'triggerSimulatorStep successfully forces a departure in Zone B');
  }

  return { suite: 'ParkingStore & Occupancy Engine', passed, failed, tests };
}
