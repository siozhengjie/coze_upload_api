import {

EXCLUSION_ADS,
EXCLUSION_MALWARE,
EXCLUSION_SCAMS,
ExclusionType,
exclusionToFriendlyName
} from './exclusion';

describe('exclusionToFriendlyName', () => {
it('should return "Ads/Trackers" for EXCLUSION_ADS', () => {
    expect(exclusionToFriendlyName(EXCLUSION_ADS)).toBe('Ads/Trackers');
});

it('should return "Malware" for EXCLUSION_MALWARE', () => {
    expect(exclusionToFriendlyName(EXCLUSION_MALWARE)).toBe('Malware');
});

it('should return "Scams" for EXCLUSION_SCAMS', () => {
    expect(exclusionToFriendlyName(EXCLUSION_SCAMS)).toBe('Scams');
});

it('should return empty string for unknown exclusion type', () => {
    const unknownType = 'UNKNOWN_TYPE' as ExclusionType;
    expect(exclusionToFriendlyName(unknownType)).toBe('');
});
});