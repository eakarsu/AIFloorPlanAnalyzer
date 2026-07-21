import test from 'node:test';import assert from 'node:assert/strict';import{evaluateDesignPlan}from'../domain/designPlan.js';
const valid={site:{widthM:10,lengthM:10},rooms:[{id:'r1',widthM:5,lengthM:5}],costCatalog:{costPerM2:1000,source:'catalog-v1',asOf:'2026-01-01'},codeChecks:[{id:'egress',status:'pass'}],schedule:[{durationDays:4}]};
test('calculates dimensions, quantities, budget and schedule',()=>{const x=evaluateDesignPlan(valid);assert.deepEqual(x.errors,[]);assert.equal(x.result.roomAreaM2,25);assert.equal(x.result.budgetEstimate,25000);assert.equal(x.result.decision,'reviewable')});
test('requires versioned cost provenance and code checks',()=>{const x=evaluateDesignPlan({...valid,costCatalog:{costPerM2:1},codeChecks:[]});assert.ok(x.errors.length>=2)});
test('rejects overallocated site',()=>{const x=evaluateDesignPlan({...valid,rooms:[{id:'r',widthM:11,lengthM:10}]});assert.ok(x.errors.some(e=>e.includes('exceeds site area')))});
