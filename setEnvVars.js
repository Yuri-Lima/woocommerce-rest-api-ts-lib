/**
 * Jest setupFiles: hermetic env for offline nock-based tests.
 * URL must match TEST_BASE in src/test/wc.test.ts (https://example.com).
 */
process.env.URL = process.env.URL || "https://example.com";
process.env.CONSUMERKEY = process.env.CONSUMERKEY || "ck_test_consumer_key_for_hermetic_nock";
process.env.CONSUMERSECRET = process.env.CONSUMERSECRET || "cs_test_consumer_secret_for_hermetic_nock";
