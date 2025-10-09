import { describe, it, expect } from 'vitest';
import { deviceStatus, deviceIsMissing } from 'src/utils/serial';
import type { ConnectedDevice, DeviceAction, Capability } from 'src/types';

const makeDevice = ({
  action,
  capabilities,
  updatedAgoMs = 0,
  description = 'M8',
}: {
  action: DeviceAction;
  capabilities: Capability[];
  updatedAgoMs?: number;
  description?: string;
}): ConnectedDevice => ({
  action_history: [action],
  device_type: 'MODEL01',
  ty_cmd_info: {
    action,
    capabilities,
    description,
    interfaces: [] as string[][],
    location: 'usb-1-1',
    model: 'Teensy 4.0',
    serial: '123',
    tag: 'dev1',
  },
  updated_at: Date.now() - updatedAgoMs,
});

describe('serial utils', () => {
  it('Ready when action add and serial present', () => {
    const d = makeDevice({ action: 'add', capabilities: ['serial', 'run'] });
    expect(deviceStatus(d)).toBe('Ready');
  });

  it('Flashing when action change and no serial capability', () => {
    const d = makeDevice({ action: 'change', capabilities: ['upload', 'reset'] });
    expect(deviceStatus(d)).toBe('Flashing');
  });

  it('Missing vs Shutdown when action miss based on updated_at', () => {
    const missing = makeDevice({ action: 'miss', capabilities: [], updatedAgoMs: 5000 });
    const shutdown = makeDevice({ action: 'miss', capabilities: [], updatedAgoMs: 500 });
    expect(deviceIsMissing(missing)).toBe(true);
    expect(deviceStatus(missing)).toBe('Missing');
    expect(deviceIsMissing(shutdown)).toBe(false);
    expect(deviceStatus(shutdown)).toBe('Shutdown');
  });

  it('HalfKay description with capabilities treated as Ready', () => {
    const d = makeDevice({ action: 'add', capabilities: ['upload', 'reset'], description: 'HalfKay' });
    expect(deviceStatus(d)).toBe('Ready');
  });

  it('Unknown when add without serial and not HalfKay', () => {
    const d = makeDevice({ action: 'add', capabilities: ['upload'] });
    expect(deviceStatus(d)).toBe('Unknown');
  });
});

