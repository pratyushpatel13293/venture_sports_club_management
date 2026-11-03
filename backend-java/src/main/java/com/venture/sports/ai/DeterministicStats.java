package com.venture.sports.ai;

/**
 * Turns an id + label into a stable pseudo-random number in [min, max].
 *
 * IMPORTANT (be honest about this in interviews): the platform does not record kills,
 * deaths or rankings. Values made with this helper (K/D, rank, MVP kills...) are
 * SIMULATED display numbers - the same input always gives the same number, so the UI
 * doesn't flicker - not real statistics.
 */
final class DeterministicStats {

    private DeterministicStats() {
    }

    static double value(String id, String label, double min, double max, int decimals) {
        int hash = 0;
        String key = id + label;
        for (int i = 0; i < key.length(); i++) {
            hash = key.charAt(i) + ((hash << 5) - hash);
        }
        double fraction = (Math.abs((long) hash) % 1000) / 1000.0;
        double raw = min + fraction * (max - min);
        double scale = Math.pow(10, decimals);
        return Math.round(raw * scale) / scale;
    }
}
