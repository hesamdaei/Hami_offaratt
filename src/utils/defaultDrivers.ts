import { Driver, AttendanceRecords } from '../types';
import { DECODED_BACKUP } from './backupDecoder';

export function getInitialDrivers(): Driver[] {
  return DECODED_BACKUP.drivers;
}

export function getInitialAttendanceRecords(): AttendanceRecords {
  return DECODED_BACKUP.records;
}

