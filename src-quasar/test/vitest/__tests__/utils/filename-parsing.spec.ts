import { describe, it, expect } from 'vitest';
import { parseFirmwareFilename } from 'src/utils/filename-parsing';

describe('parseFirmwareFilename', () => {
  it('parses M8_V6_2_0_BETA8A_MODEL02.hex', () => {
    expect(parseFirmwareFilename('M8_V6_2_0_BETA8A_MODEL02.hex')).toEqual({
      version: '6.2.0 Beta 8A',
      model: 'MODEL:02',
    });
  });

  it('parses M8_V6_2_0_BETA8_MODEL02.hex', () => {
    expect(parseFirmwareFilename('M8_V6_2_0_BETA8_MODEL02.hex')).toEqual({
      version: '6.2.0 Beta 8',
      model: 'MODEL:02',
    });
  });

  it('parses M8_V2_0_0.hex', () => {
    expect(parseFirmwareFilename('M8_V2_0_0.hex')).toEqual({
      version: '2.0.0',
      model: 'MODEL:01',
    });
  });

  it('parses M8_V2_0_7.hex', () => {
    expect(parseFirmwareFilename('M8_V2_0_7.hex')).toEqual({
      version: '2.0.7',
      model: 'MODEL:01',
    });
  });

  it('parses M8_V4_0_2_MODEL01.hex', () => {
    expect(parseFirmwareFilename('M8_V4_0_2_MODEL01.hex')).toEqual({
      version: '4.0.2',
      model: 'MODEL:01',
    });
  });

  it('parses M8_V4_0_2_MODEL02.hex', () => {
    expect(parseFirmwareFilename('M8_V4_0_2_MODEL02.hex')).toEqual({
      version: '4.0.2',
      model: 'MODEL:02',
    });
  });

  it('parses M8_V6_0_0B_MODEL01.hex', () => {
    expect(parseFirmwareFilename('M8_V6_0_0B_MODEL01.hex')).toEqual({
      version: '6.0.0B',
      model: 'MODEL:01',
    });
  });

  it('parses M8_V6_0_0B_MODEL02.hex', () => {
    expect(parseFirmwareFilename('M8_V6_0_0B_MODEL02.hex')).toEqual({
      version: '6.0.0B',
      model: 'MODEL:02',
    });
  });

  it('parses M8_V6_0_2A_MODEL01.hex', () => {
    expect(parseFirmwareFilename('M8_V6_0_2A_MODEL01.hex')).toEqual({
      version: '6.0.2A',
      model: 'MODEL:01',
    });
  });

  it('returns null for invalid filename', () => {
    expect(parseFirmwareFilename('invalid_filename.hex')).toBeNull();
  });
});
