import { Driver, AttendanceRecords, AttendanceStatus, StaffMember } from '../types';
import { VehicleItem, DriverDirectoryItem } from './fleetSeedData';
import { ServiceRule } from '../components/OilServiceManagementView';
import { normalizePersianDigits } from './jalaali';

export interface DecodedBackupResult {
  vehicles: VehicleItem[];
  drivers: Driver[];
  driverDirectory: DriverDirectoryItem[];
  records: AttendanceRecords;
  staffMembers: StaffMember[];
  staffRecords: AttendanceRecords;
  rules: Record<string, ServiceRule>;
}

// Raw user backup dataset updated from latest official fleet PDF (14050722__c79532b9.pdf)
export const RAW_BACKUP_PAYLOAD = {
  vehicles: [
    { id: "v0", code: "1", type: "KHAAVAR", plate: "۲۵ع۵۳۳-۶۶", currentMileage: 0, lastChangeMileage: 0, lastChangeDate: "1405/07/07", tripsSinceChange: 5, insuranceExpiry: "۱۴۰۶/۰۵/۲۸", inspectionExpiry: "۱۴۰۵/۱۰/۱۵", bodyInsExpiry: "", serviceHistory: [{ date: "1405/07/07", mileage: 0, trips: 50 }] },
    { id: "v1", code: "2", type: "KHAAVAR", plate: "۵۳ع۹۳۶-۵۵", currentMileage: 0, lastChangeMileage: 0, lastChangeDate: "1405/06/13", tripsSinceChange: 32, insuranceExpiry: "۱۴۰۵/۰۸/۲۸", inspectionExpiry: "۱۴۰۵/۰۸/۱۰", bodyInsExpiry: "", serviceHistory: [] },
    { id: "v2", code: "4", type: "KHAAVAR", plate: "۵۶ع۴۱۶-۶۶", currentMileage: 0, lastChangeMileage: 0, lastChangeDate: "1405/06/03", tripsSinceChange: 49, insuranceExpiry: "۱۴۰۶/۰۲/۰۲", inspectionExpiry: "۱۴۰۵/۱۰/۱۱", bodyInsExpiry: "", serviceHistory: [{ date: "1405/07/08", mileage: 0, trips: 44 }] },
    { id: "v3", code: "5", type: "KHAAVAR", plate: "۴۵ع۷۹۱-۵۱", currentMileage: 0, lastChangeMileage: 0, lastChangeDate: "1405/07/08", tripsSinceChange: 7, insuranceExpiry: "۱۴۰۵/۰۸/۱۳", inspectionExpiry: "۱۴۰۵/۰۸/۰۶", bodyInsExpiry: "", serviceHistory: [{ date: "1405/07/08", mileage: 0, trips: 6 }] },
    { id: "v4", code: "6", type: "KHAAVAR", plate: "۱۱ع۱۶۵-۴۴", currentMileage: 0, lastChangeMileage: 0, lastChangeDate: "1405/06/28", tripsSinceChange: 16, insuranceExpiry: "۱۴۰۶/۰۳/۱۳", inspectionExpiry: "۱۴۰۵/۰۸/۰۴", bodyInsExpiry: "", serviceHistory: [] },
    { id: "v5", code: "7", type: "KHAAVAR", plate: "۵۵ع۷۶۵-۵۱", currentMileage: 0, lastChangeMileage: 0, lastChangeDate: "1405/06/06", tripsSinceChange: 50, insuranceExpiry: "۱۴۰۶/۰۵/۲۹", inspectionExpiry: "۱۴۰۵/۱۰/۰۴", bodyInsExpiry: "", serviceHistory: [] },
    { id: "v6", code: "8", type: "KHAAVAR", plate: "۶۲ع۱۸۹-۶۶", currentMileage: 0, lastChangeMileage: 0, lastChangeDate: "1405/06/13", tripsSinceChange: 41, insuranceExpiry: "۱۴۰۵/۱۰/۱۶", inspectionExpiry: "۱۴۰۵/۰۹/۳۰", bodyInsExpiry: "", serviceHistory: [] },
    { id: "v7", code: "9", type: "KHAAVAR", plate: "۳۵ع۹۸۱-۶۶", currentMileage: 0, lastChangeMileage: 0, lastChangeDate: "1405/05/31", tripsSinceChange: 39, insuranceExpiry: "۱۴۰۶/۰۳/۲۰", inspectionExpiry: "۱۴۰۵/۰۸/۰۶", bodyInsExpiry: "", serviceHistory: [] },
    { id: "v8", code: "10", type: "KHAAVAR", plate: "۶۵ع۹۶۹-۴۴", currentMileage: 0, lastChangeMileage: 0, lastChangeDate: "1405/06/29", tripsSinceChange: 21, insuranceExpiry: "۱۴۰۶/۰۲/۰۵", inspectionExpiry: "۱۴۰۵/۰۸/۲۰", bodyInsExpiry: "", serviceHistory: [] },
    { id: "v9", code: "11", type: "KHAAVAR", plate: "۳۲ع۵۷۲-۶۶", currentMileage: 0, lastChangeMileage: 0, lastChangeDate: "1405/06/28", tripsSinceChange: 27, insuranceExpiry: "۱۴۰۵/۰۹/۳۰", inspectionExpiry: "۱۴۰۵/۰۹/۲۹", bodyInsExpiry: "", serviceHistory: [] },
    { id: "v10", code: "12", type: "KHAAVAR", plate: "۱۳ع۹۳۶-۵۵", currentMileage: 0, lastChangeMileage: 0, lastChangeDate: "1405/07/08", tripsSinceChange: 9, insuranceExpiry: "۱۴۰۵/۰۹/۰۷", inspectionExpiry: "۱۴۰۵/۰۸/۱۷", bodyInsExpiry: "", serviceHistory: [{ date: "1405/07/09", mileage: 0, trips: 50 }] },
    { id: "v11", code: "13", type: "KHAAVAR", plate: "۲۸ع۳۷۶-۵۵", currentMileage: 0, lastChangeMileage: 0, lastChangeDate: "1405/06/18", tripsSinceChange: 31, insuranceExpiry: "۱۴۰۶/۰۴/۲۸", inspectionExpiry: "۱۴۰۵/۰۹/۲۹", bodyInsExpiry: "", serviceHistory: [] },
    { id: "v12", code: "14", type: "KHAAVAR", plate: "۸۶ع۳۴۲-۵۵", currentMileage: 0, lastChangeMileage: 0, lastChangeDate: "1405/07/08", tripsSinceChange: 9, insuranceExpiry: "۱۴۰۵/۱۱/۲۹", inspectionExpiry: "۱۴۰۵/۰۸/۰۶", bodyInsExpiry: "", serviceHistory: [{ date: "1405/07/09", mileage: 0, trips: 57 }] },
    { id: "v13", code: "15", type: "KHAAVAR", plate: "۹۱ع۷۵۲-۵۵", currentMileage: 0, lastChangeMileage: 0, lastChangeDate: "1405/06/16", tripsSinceChange: 59, insuranceExpiry: "۱۴۰۵/۰۹/۰۸", inspectionExpiry: "۱۴۰۵/۱۰/۲۰", bodyInsExpiry: "", serviceHistory: [] },
    { id: "v14", code: "17", type: "KHAAVAR", plate: "۴۱ع۵۸۷-۶۶", currentMileage: 0, lastChangeMileage: 0, lastChangeDate: "1405/07/08", tripsSinceChange: 8, insuranceExpiry: "۱۴۰۶/۰۳/۰۸", inspectionExpiry: "۱۴۰۵/۱۰/۰۴", bodyInsExpiry: "", serviceHistory: [{ date: "1405/07/09", mileage: 0, trips: 58 }] },
    { id: "v15", code: "18", type: "KHAAVAR", plate: "۴۳ع۳۳۱-۶۶", currentMileage: 0, lastChangeMileage: 0, lastChangeDate: "1405/06/18", tripsSinceChange: 31, insuranceExpiry: "۱۴۰۵/۱۲/۰۱", inspectionExpiry: "۱۴۰۵/۰۸/۱۰", bodyInsExpiry: "", serviceHistory: [] },
    { id: "v19", code: "50", type: "HYUNDAI", plate: "۸۶ع۵۶۵-۵۵", currentMileage: 0, lastChangeMileage: 0, lastChangeDate: "1405/06/11", tripsSinceChange: 46, insuranceExpiry: "۱۴۰۶/۰۵/۲۳", inspectionExpiry: "۱۴۰۵/۱۰/۱۸", bodyInsExpiry: "۱۴۰۶/۰۲/۰۴", serviceHistory: [] },
    { id: "v20", code: "51", type: "HYUNDAI", plate: "۲۲ع۹۵۹-۶۶", currentMileage: 0, lastChangeMileage: 0, lastChangeDate: "1405/06/21", tripsSinceChange: 41, insuranceExpiry: "۱۴۰۵/۰۹/۱۹", inspectionExpiry: "۱۴۰۵/۰۹/۰۹", bodyInsExpiry: "۱۴۰۶/۰۲/۲۲", serviceHistory: [] },
    { id: "v21", code: "52", type: "HYUNDAI", plate: "۱۷ع۴۴۸-۶۶", currentMileage: 0, lastChangeMileage: 0, lastChangeDate: "1405/06/28", tripsSinceChange: 28, insuranceExpiry: "۱۴۰۵/۱۱/۰۴", inspectionExpiry: "۱۴۰۵/۱۰/۲۰", bodyInsExpiry: "۱۴۰۶/۰۲/۲۲", serviceHistory: [] },
    { id: "v22", code: "53", type: "HYUNDAI", plate: "۶۷ع۱۸۴-۵۱", currentMileage: 0, lastChangeMileage: 0, lastChangeDate: "1405/07/08", tripsSinceChange: 4, insuranceExpiry: "۱۴۰۵/۱۲/۰۶", inspectionExpiry: "۱۴۰۵/۰۹/۰۹", bodyInsExpiry: "۱۴۰۶/۰۲/۳۰", serviceHistory: [{ date: "1405/05/17", mileage: 0, trips: 58 }] },
    { id: "v23", code: "54", type: "HYUNDAI", plate: "۸۳ع۱۸۷-۵۵", currentMileage: 0, lastChangeMileage: 0, lastChangeDate: "1405/07/08", tripsSinceChange: 17, insuranceExpiry: "۱۴۰۵/۱۱/۱۴", inspectionExpiry: "۱۴۰۵/۰۸/۲۰", bodyInsExpiry: "۱۴۰۵/۰۸/۱۱", serviceHistory: [{ date: "1405/07/06", mileage: 0, trips: 4 }] },
    { id: "v24", code: "55", type: "HYUNDAI", plate: "۷۸ع۹۳۸-۵۵", currentMileage: 0, lastChangeMileage: 0, lastChangeDate: "1405/06/26", tripsSinceChange: 26, insuranceExpiry: "۱۴۰۶/۰۴/۲۴", inspectionExpiry: "۱۴۰۵/۱۰/۰۴", bodyInsExpiry: "۱۴۰۵/۰۸/۱۱", serviceHistory: [] },
    { id: "v25", code: "56", type: "HYUNDAI", plate: "۹۱ع۷۱۲-۵۵", currentMileage: 0, lastChangeMileage: 0, lastChangeDate: "1405/07/08", tripsSinceChange: 4, insuranceExpiry: "۱۴۰۶/۰۱/۲۵", inspectionExpiry: "۱۴۰۵/۱۰/۱۵", bodyInsExpiry: "۱۴۰۶/۰۲/۲۲", serviceHistory: [{ date: "1405/05/07", mileage: 0, trips: 47 }] },
    { id: "v26", code: "57", type: "HYUNDAI", plate: "۶۴ع۷۸۸-۵۵", currentMileage: 0, lastChangeMileage: 0, lastChangeDate: "1405/06/27", tripsSinceChange: 34, insuranceExpiry: "۱۴۰۶/۰۷/۱۸", inspectionExpiry: "۱۴۰۵/۱۰/۰۲", bodyInsExpiry: "۱۴۰۶/۰۳/۱۷", serviceHistory: [] },
    { id: "v27", code: "58", type: "HYUNDAI", plate: "۹۱ع۷۵۶-۵۵", currentMileage: 0, lastChangeMileage: 0, lastChangeDate: "1405/05/06", tripsSinceChange: 22, insuranceExpiry: "۱۴۰۵/۱۰/۲۹", inspectionExpiry: "۱۴۰۵/۰۸/۰۷", bodyInsExpiry: "۱۴۰۵/۱۲/۰۱", serviceHistory: [] },
    { id: "v28", code: "59", type: "HYUNDAI", plate: "۹۶ع۵۳۶-۵۵", currentMileage: 0, lastChangeMileage: 0, lastChangeDate: "1405/07/05", tripsSinceChange: 16, insuranceExpiry: "۱۴۰۶/۰۲/۲۹", inspectionExpiry: "۱۴۰۵/۱۰/۱۵", bodyInsExpiry: "۱۴۰۶/۰۳/۰۳", serviceHistory: [] },
    { id: "v29", code: "60", type: "HYUNDAI", plate: "۹۶ع۴۸۲-۵۵", currentMileage: 0, lastChangeMileage: 0, lastChangeDate: "1405/05/31", tripsSinceChange: 67, insuranceExpiry: "۱۴۰۶/۰۷/۰۷", inspectionExpiry: "۱۴۰۵/۰۸/۲۵", bodyInsExpiry: "۱۴۰۶/۰۴/۱۶", serviceHistory: [] },
    { id: "v30", code: "61", type: "HYUNDAI", plate: "۸۸ع۳۳۷-۵۵", currentMileage: 0, lastChangeMileage: 0, lastChangeDate: "1405/06/16", tripsSinceChange: 48, insuranceExpiry: "۱۴۰۶/۰۴/۱۲", inspectionExpiry: "۱۴۰۵/۱۰/۲۰", bodyInsExpiry: "۱۴۰۶/۰۶/۰۲", serviceHistory: [] },
    { id: "v31", code: "62", type: "HYUNDAI", plate: "۸۹ع۶۸۳-۵۵", currentMileage: 100, lastChangeMileage: 100, lastChangeDate: "1405/06/22", tripsSinceChange: 39, insuranceExpiry: "۱۴۰۶/۰۵/۱۵", inspectionExpiry: "۱۴۰۵/۱۰/۱۹", bodyInsExpiry: "۱۴۰۶/۰۶/۱۱", serviceHistory: [] },
    { id: "v32", code: "63", type: "HYUNDAI", plate: "۴۵ع۴۱۴-۵۱", currentMileage: 0, lastChangeMileage: 0, lastChangeDate: "1405/06/23", tripsSinceChange: 24, insuranceExpiry: "۱۴۰۶/۰۳/۲۷", inspectionExpiry: "۱۴۰۵/۱۰/۲۲", bodyInsExpiry: "۱۴۰۶/۰۳/۱۹", serviceHistory: [] },
    { id: "v33", code: "64", type: "HYUNDAI", plate: "۸۸ع۸۳۵-۴۴", currentMileage: 0, lastChangeMileage: 0, lastChangeDate: "1405/06/18", tripsSinceChange: 39, insuranceExpiry: "۱۴۰۵/۰۹/۲۴", inspectionExpiry: "۱۴۰۵/۰۸/۱۰", bodyInsExpiry: "۱۴۰۶/۰۳/۰۸", serviceHistory: [] },
    { id: "v34", code: "65", type: "HYUNDAI", plate: "۲۳ع۳۱۳-۵۵", currentMileage: 0, lastChangeMileage: 0, lastChangeDate: "1405/07/08", tripsSinceChange: 8, insuranceExpiry: "۱۴۰۵/۱۰/۰۶", inspectionExpiry: "۱۴۰۵/۰۹/۳۰", bodyInsExpiry: "۱۴۰۶/۰۷/۲۱", serviceHistory: [{ date: "1405/07/08", mileage: 0, trips: 55 }] },
    { id: "v35", code: "66", type: "HYUNDAI", plate: "۷۲ع۲۸۶-۵۱", currentMileage: 0, lastChangeMileage: 0, lastChangeDate: "1405/06/31", tripsSinceChange: 23, insuranceExpiry: "۱۴۰۶/۰۱/۱۷", inspectionExpiry: "۱۴۰۵/۰۹/۲۹", bodyInsExpiry: "۱۴۰۶/۰۳/۰۷", serviceHistory: [] },
    { id: "v36", code: "67", type: "HYUNDAI", plate: "۷۶ع۵۳۲-۵۵", currentMileage: 1000, lastChangeMileage: 0, lastChangeDate: "1405/06/12", tripsSinceChange: 59, insuranceExpiry: "۱۴۰۶/۰۴/۲۱", inspectionExpiry: "۱۴۰۵/۱۰/۲۱", bodyInsExpiry: "۱۴۰۶/۰۵/۰۴", serviceHistory: [] },
    { id: "v37", code: "68", type: "HYUNDAI", plate: "۷۶ع۶۸۱-۵۵", currentMileage: 0, lastChangeMileage: 0, lastChangeDate: "1405/07/01", tripsSinceChange: 15, insuranceExpiry: "۱۴۰۵/۱۲/۱۹", inspectionExpiry: "۱۴۰۵/۰۷/۲۱", bodyInsExpiry: "۱۴۰۶/۰۵/۰۲", serviceHistory: [] },
    { id: "v38", code: "69", type: "HYUNDAI", plate: "۷۶ع۷۳۴-۵۵", currentMileage: 0, lastChangeMileage: 0, lastChangeDate: "1405/07/08", tripsSinceChange: 8, insuranceExpiry: "۱۴۰۵/۱۰/۱۸", inspectionExpiry: "۱۴۰۵/۰۸/۰۷", bodyInsExpiry: "۱۴۰۶/۰۷/۰۳", serviceHistory: [{ date: "1405/07/07", mileage: 0, trips: 59 }] },
    { id: "v39", code: "70", type: "HYUNDAI", plate: "۸۴ع۴۶۵-۵۵", currentMileage: 3600, lastChangeMileage: 3600, lastChangeDate: "1405/07/08", tripsSinceChange: 15, insuranceExpiry: "۱۴۰۵/۱۱/۲۹", inspectionExpiry: "۱۴۰۵/۰۸/۱۰", bodyInsExpiry: "۱۴۰۵/۱۲/۰۱", serviceHistory: [{ date: "1405/06/22", mileage: 3600, trips: 22 }] },
    { id: "v40", code: "71", type: "HYUNDAI", plate: "۳۵ع۷۳۴-۶۶", currentMileage: 0, lastChangeMileage: 0, lastChangeDate: "1405/07/08", tripsSinceChange: 10, insuranceExpiry: "۱۴۰۵/۰۸/۱۶", inspectionExpiry: "۱۴۰۵/۰۹/۳۰", bodyInsExpiry: "۱۴۰۶/۰۷/۰۵", serviceHistory: [{ date: "1405/07/07", mileage: 0, trips: 38 }] },
    { id: "v41", code: "73", type: "HYUNDAI", plate: "۵۳ع۴۱۵-۶۶", currentMileage: 3100, lastChangeMileage: 0, lastChangeDate: "1405/06/13", tripsSinceChange: 54, insuranceExpiry: "۱۴۰۵/۱۲/۱۷", inspectionExpiry: "۱۴۰۵/۱۰/۰۴", bodyInsExpiry: "۱۴۰۶/۰۵/۰۷", serviceHistory: [] },
    { id: "v42", code: "74", type: "HYUNDAI", plate: "۵۵ع۴۵۱-۶۶", currentMileage: 1900, lastChangeMileage: 0, lastChangeDate: "1405/06/27", tripsSinceChange: 27, insuranceExpiry: "۱۴۰۵/۱۰/۲۵", inspectionExpiry: "۱۴۰۵/۰۸/۰۴", bodyInsExpiry: "۱۴۰۶/۰۷/۱۵", serviceHistory: [] },
    { id: "v44", code: "100", type: "ISUZU", plate: "۸۸ع۱۲۷-۵۵", currentMileage: 824376, lastChangeMileage: 824376, lastChangeDate: "1405/07/08", tripsSinceChange: 19, insuranceExpiry: "۱۴۰۶/۰۲/۲۸", inspectionExpiry: "۱۴۰۵/۰۷/۲۴", bodyInsExpiry: "۱۴۰۶/۰۳/۰۲", serviceHistory: [{ date: "1405/06/19", mileage: 824376, trips: 0 }] },
    { id: "v45", code: "101", type: "ISUZU", plate: "۱۸ع۴۴۱-۶۶", currentMileage: 0, lastChangeMileage: 0, lastChangeDate: "1405/05/08", tripsSinceChange: 0, insuranceExpiry: "۱۴۰۵/۰۹/۲۹", inspectionExpiry: "۱۴۰۵/۰۶/۲۶", bodyInsExpiry: "۱۴۰۵/۰۵/۱۲", serviceHistory: [] },
    { id: "v46", code: "102", type: "ISUZU", plate: "۶۷ع۵۲۳-۵۱", currentMileage: 0, lastChangeMileage: 0, lastChangeDate: "1405/07/13", tripsSinceChange: 13, insuranceExpiry: "۱۴۰۶/۰۱/۲۳", inspectionExpiry: "۱۴۰۵/۰۸/۱۷", bodyInsExpiry: "۱۴۰۶/۰۳/۰۹", serviceHistory: [{ date: "1405/07/13", mileage: 0, trips: 13 }] },
    { id: "v47", code: "103", type: "ISUZU", plate: "۶۷ع۱۸۱-۵۱", currentMileage: 279953, lastChangeMileage: 279953, lastChangeDate: "1405/07/15", tripsSinceChange: 0, insuranceExpiry: "۱۴۰۶/۰۳/۰۳", inspectionExpiry: "۱۴۰۵/۱۰/۲۰", bodyInsExpiry: "۱۴۰۶/۰۳/۰۹", serviceHistory: [{ date: "1405/07/15", mileage: 279953, trips: 0 }] },
    { id: "v48", code: "104", type: "ISUZU", plate: "۶۴ع۷۹۴-۵۵", currentMileage: 820666, lastChangeMileage: 817664, lastChangeDate: "1405/07/03", tripsSinceChange: 5, insuranceExpiry: "۱۴۰۵/۰۹/۱۴", inspectionExpiry: "۱۴۰۵/۰۹/۱۱", bodyInsExpiry: "۱۴۰۶/۰۶/۱۹", serviceHistory: [] },
    { id: "v49", code: "105", type: "ISUZU", plate: "۵۴ع۱۲۲-۵۵", currentMileage: 290918, lastChangeMileage: 290918, lastChangeDate: "1405/07/12", tripsSinceChange: 2, insuranceExpiry: "۱۴۰۶/۰۴/۱۶", inspectionExpiry: "۱۴۰۵/۰۷/۲۴", bodyInsExpiry: "۱۴۰۵/۰۹/۱۲", serviceHistory: [{ date: "1405/06/11", mileage: 290918, trips: 1 }] },
    { id: "v50", code: "106", type: "ISUZU", plate: "۲۵ع۵۴۹-۶۶", currentMileage: 708594, lastChangeMileage: 705594, lastChangeDate: "1405/07/06", tripsSinceChange: 15, insuranceExpiry: "۱۴۰۶/۰۱/۲۷", inspectionExpiry: "۱۴۰۵/۰۸/۰۴", bodyInsExpiry: "۱۴۰۶/۰۳/۰۸", serviceHistory: [] },
    { id: "v51", code: "107", type: "ISUZU", plate: "۶۲ع۴۴۸-۵۵", currentMileage: 0, lastChangeMileage: 0, lastChangeDate: "1405/07/05", tripsSinceChange: 19, insuranceExpiry: "۱۴۰۵/۱۲/۰۱", inspectionExpiry: "۱۴۰۵/۱۰/۲۰", bodyInsExpiry: "۱۴۰۶/۰۳/۰۷", serviceHistory: [] },
    { id: "v53", code: "150", type: "NISSAN", plate: "۶۲د۷۳۷-۶۰", currentMileage: 308917, lastChangeMileage: 307916, lastChangeDate: "1405/06/29", tripsSinceChange: 0, insuranceExpiry: "۱۴۰۵/۰۹/۱۷", inspectionExpiry: "۱۴۰۶/۰۱/۲۴", bodyInsExpiry: "۱۴۰۶/۰۵/۲۴", serviceHistory: [] },
    { id: "v54", code: "151", type: "NISSAN", plate: "۳۲ل۴۷۵-۲۰", currentMileage: 310620, lastChangeMileage: 308738, lastChangeDate: "1405/06/22", tripsSinceChange: 0, insuranceExpiry: "۱۴۰۶/۰۱/۲۰", inspectionExpiry: "۱۴۰۵/۱۰/۱۷", bodyInsExpiry: "۱۴۰۶/۰۷/۰۸", serviceHistory: [] },
    { id: "v55", code: "152", type: "NISSAN", plate: "۹۴ی۳۸۴-۷۷", currentMileage: 0, lastChangeMileage: 0, lastChangeDate: "1405/07/08", tripsSinceChange: 0, insuranceExpiry: "۱۴۰۶/۰۳/۰۲", inspectionExpiry: "۱۴۰۵/۱۱/۰۶", bodyInsExpiry: "۱۴۰۶/۰۳/۰۹", serviceHistory: [] },
    { id: "v56", code: "153", type: "NISSAN", plate: "۴۸ی۴۱۱-۱۰", currentMileage: 352277, lastChangeMileage: 352278, lastChangeDate: "1405/06/21", tripsSinceChange: 0, insuranceExpiry: "۱۴۰۶/۰۳/۰۶", inspectionExpiry: "۱۴۰۵/۱۰/۱۶", bodyInsExpiry: "۱۴۰۶/۰۳/۰۴", serviceHistory: [] },
    { id: "v57", code: "154", type: "NISSAN", plate: "۵۲ق۵۹۵-۱۰", currentMileage: 357384, lastChangeMileage: 357384, lastChangeDate: "1405/07/11", tripsSinceChange: 0, insuranceExpiry: "۱۴۰۶/۰۳/۰۱", inspectionExpiry: "۱۴۰۶/۰۲/۲۷", bodyInsExpiry: "۱۴۰۶/۰۳/۰۴", serviceHistory: [] },
    { id: "v58", code: "155", type: "NISSAN", plate: "۵۶ن۸۴۶-۴۰", currentMileage: 325380, lastChangeMileage: 325380, lastChangeDate: "1405/07/08", tripsSinceChange: 0, insuranceExpiry: "۱۴۰۵/۰۸/۰۳", inspectionExpiry: "۱۴۰۶/۰۱/۰۵", bodyInsExpiry: "۱۴۰۶/۰۱/۳۰", serviceHistory: [] },
    { id: "v59", code: "156", type: "NISSAN", plate: "۹۹ج۴۱۳-۳۳", currentMileage: 298726, lastChangeMileage: 297559, lastChangeDate: "1405/06/04", tripsSinceChange: 0, insuranceExpiry: "۱۴۰۶/۰۶/۲۲", inspectionExpiry: "۱۴۰۵/۱۱/۲۱", bodyInsExpiry: "۱۴۰۵/۱۰/۲۰", serviceHistory: [] },
    { id: "v60", code: "157", type: "NISSAN", plate: "۷۲ج۷۵۵-۶۰", currentMileage: 138200, lastChangeMileage: 135770, lastChangeDate: "1405/07/11", tripsSinceChange: 0, insuranceExpiry: "۱۴۰۵/۱۱/۲۴", inspectionExpiry: "۱۴۰۶/۱۱/۲۳", bodyInsExpiry: "۱۴۰۶/۰۱/۲۰", serviceHistory: [] },
    { id: "v61", code: "158", type: "NISSAN", plate: "۷۴ج۸۵۵-۶۰", currentMileage: 284511, lastChangeMileage: 280919, lastChangeDate: "1405/07/04", tripsSinceChange: 0, insuranceExpiry: "۱۴۰۵/۱۲/۱۵", inspectionExpiry: "۱۴۰۶/۰۱/۳۰", bodyInsExpiry: "۱۴۰۶/۰۱/۲۷", serviceHistory: [] },
    { id: "v62", code: "159", type: "NISSAN", plate: "۶۵س۷۲۶-۶۰", currentMileage: 123417, lastChangeMileage: 122059, lastChangeDate: "1405/06/18", tripsSinceChange: 0, insuranceExpiry: "۱۴۰۵/۱۲/۲۵", inspectionExpiry: "۱۴۰۶/۰۳/۰۱", bodyInsExpiry: "۱۴۰۶/۰۴/۲۸", serviceHistory: [] },
    { id: "v63", code: "160", type: "NISSAN", plate: "۳۲ن۷۶۳-۶۰", currentMileage: 160410, lastChangeMileage: 160410, lastChangeDate: "1405/07/05", tripsSinceChange: 0, insuranceExpiry: "۱۴۰۶/۰۱/۲۷", inspectionExpiry: "۱۴۰۵/۱۱/۰۴", bodyInsExpiry: "۱۴۰۵/۱۲/۲۴", serviceHistory: [] },
    { id: "v64", code: "161", type: "NISSAN", plate: "۳۲ن۸۳۶-۶۰", currentMileage: 117756, lastChangeMileage: 114600, lastChangeDate: "1405/07/11", tripsSinceChange: 0, insuranceExpiry: "۱۴۰۶/۰۳/۱۸", inspectionExpiry: "۱۴۰۷/۰۱/۰۱", bodyInsExpiry: "۱۴۰۶/۰۲/۱۱", serviceHistory: [] },
    { id: "v65", code: "200", type: "CAR", plate: "۲۹ب۲۷۷-۲۰", currentMileage: 0, lastChangeMileage: 0, lastChangeDate: "1405/01/15", tripsSinceChange: 15, insuranceExpiry: "۱۴۰۶/۰۵/۳۱", inspectionExpiry: "۱۴۰۷/۰۵/۳۱", bodyInsExpiry: "", serviceHistory: [] },
    { id: "v66", code: "201", type: "CAR", plate: "۲۶ن۲۴۷-۶۶", currentMileage: 0, lastChangeMileage: 0, lastChangeDate: "1405/01/15", tripsSinceChange: 0, insuranceExpiry: "۱۴۰۶/۰۴/۱۵", inspectionExpiry: "۱۴۰۵/۱۱/۱۸", bodyInsExpiry: "", serviceHistory: [] },
    { id: "v67", code: "202", type: "CAR", plate: "۸۵ن۱۲۴-۵۰", currentMileage: 0, lastChangeMileage: 0, lastChangeDate: "1405/01/15", tripsSinceChange: 0, insuranceExpiry: "۱۴۰۶/۰۷/۱۴", inspectionExpiry: "۱۴۰۵/۰۷/۱۹", bodyInsExpiry: "", serviceHistory: [] },
    { id: "v68", code: "250", type: "CAR", plate: "۵۲۶۱۵-۱۵۸", currentMileage: 0, lastChangeMileage: 0, lastChangeDate: "1405/01/15", tripsSinceChange: 0, insuranceExpiry: "۱۴۰۶/۰۷/۱۶", inspectionExpiry: "۱۴۰۸/۰۱/۰۱", bodyInsExpiry: "", serviceHistory: [] },
    { id: "v69", code: "251", type: "CAR", plate: "۵۲۶۱۱-۱۵۸", currentMileage: 0, lastChangeMileage: 0, lastChangeDate: "1405/01/15", tripsSinceChange: 0, insuranceExpiry: "۱۴۰۶/۰۷/۱۹", inspectionExpiry: "۱۴۰۸/۰۱/۰۱", bodyInsExpiry: "", serviceHistory: [] },
    { id: "v70", code: "500", type: "CAR", plate: "۸۳ه۳۵۴-۵۰", currentMileage: 0, lastChangeMileage: 0, lastChangeDate: "1405/01/15", tripsSinceChange: 0, insuranceExpiry: "۱۴۰۶/۰۱/۲۷", inspectionExpiry: "۱۴۰۶/۰۱/۲۵", bodyInsExpiry: "", serviceHistory: [] },
    { id: "v71", code: "501", type: "CAR", plate: "۹۸ب۸۳۶-۵۰", currentMileage: 0, lastChangeMileage: 0, lastChangeDate: "1405/01/15", tripsSinceChange: 0, insuranceExpiry: "۱۴۰۶/۰۷/۰۱", inspectionExpiry: "", bodyInsExpiry: "", serviceHistory: [] },
    { id: "v72", code: "502", type: "CAR", plate: "۷۲س۹۹۳-۶۶", currentMileage: 0, lastChangeMileage: 0, lastChangeDate: "1405/01/15", tripsSinceChange: 0, insuranceExpiry: "۱۴۰۶/۰۱/۲۵", inspectionExpiry: "۱۴۰۶/۰۱/۲۶", bodyInsExpiry: "۱۴۰۵/۱۱/۰۱", serviceHistory: [] },
  ],
  drivers: [
    { id: "attendance-1", name: "رحیم بدرلو", phone: "۰۹۱۴۴۸۲۰۷۱۸", code: "1" },
    { id: "attendance-2", name: "بهروز حیدری", phone: "۰۹۱۶۶۹۷۱۵۵۲", code: "2" },
    { id: "attendance-4", name: "سید اقبال هدیه", phone: "۰۹۱۹۲۴۳۶۳۲۰", code: "4" },
    { id: "attendance-5", name: "نادر صابون پز", phone: "۰۹۳۶۱۷۷۹۲۶۱", code: "5" },
    { id: "attendance-6", name: "محسن مقدسی", phone: "۰۹۳۵۲۲۳۴۰۱۰", code: "6" },
    { id: "attendance-7", name: "محسن مقدسی / علی کشاورز", phone: "۰۹۳۵۲۲۳۴۰۱۰ / ۰۹۳۰۵۳۸۶۷۵۷", code: "7" },
    { id: "attendance-8", name: "مهدی رضائی ده", phone: "۰۹۰۵۶۳۷۹۹۳۴", code: "8" },
    { id: "attendance-9", name: "امین تندیس", phone: "۰۹۱۶۸۴۴۰۵۴۹", code: "9" },
    { id: "attendance-11", name: "حمید خاکی", phone: "۰۹۹۰۹۴۸۶۱۵۶", code: "11" },
    { id: "attendance-12", name: "وحید محمودی", phone: "۰۹۰۲۱۳۶۴۹۲۷", code: "12" },
    { id: "attendance-13", name: "عبداله فرامرزی", phone: "۰۹۱۱۳۳۷۲۸۰۸", code: "13" },
    { id: "attendance-14", name: "اکبر فاروغی", phone: "۰۹۳۶۶۴۶۰۰۳۵", code: "14" },
    { id: "attendance-15", name: "مرتضی نادری", phone: "۰۹۱۰۰۶۵۷۳۵۷", code: "15" },
    { id: "attendance-17", name: "علی خرمی", phone: "۰۹۳۹۶۷۰۸۴۴۲", code: "17" },
    { id: "attendance-18", name: "رسول رحمان زاد", phone: "۰۹۹۱۶۴۹۱۸۶۸", code: "18" },
    { id: "attendance-50", name: "سید مجتبی", phone: "۰۹۱۹۳۲۸۱۲۸۸", code: "50" },
    { id: "attendance-51", name: "مجتبی رضایی", phone: "۰۹۱۹۱۸۱۷۶۶۵", code: "51" },
    { id: "attendance-53", name: "مهدی باقری", phone: "۰۹۳۵۲۲۸۳۱۲۲", code: "53" },
    { id: "attendance-54", name: "نادر حسابی نامقی", phone: "۰۹۹۳۰۹۷۸۵۳۴", code: "54" },
    { id: "attendance-55", name: "عباس بیراوند", phone: "۰۹۳۸۵۹۹۸۳۸۰", code: "55" },
    { id: "attendance-56", name: "منوچهر سلیمی پور", phone: "۰۹۲۳۲۴۹۱۰۶۶", code: "56" },
    { id: "attendance-57", name: "علیرضا پور ابراهیم", phone: "۰۹۱۹۲۰۲۱۸۲۱", code: "57" },
    { id: "attendance-59", name: "محمد صدیق عباسی", phone: "۰۹۱۸۴۵۰۰۷۴۵", code: "59" },
    { id: "attendance-60", name: "حسین شهنازی", phone: "۰۹۳۷۸۴۲۳۸۵۰", code: "60" },
    { id: "attendance-61", name: "یوسف نامی زاده", phone: "۰۹۰۱۷۱۱۱۸۲۰", code: "61" },
    { id: "attendance-62", name: "مجتبی علی آبادی", phone: "۰۹۱۳۳۷۱۸۳۰۹", code: "62" },
    { id: "attendance-63", name: "حسین سیاح", phone: "۰۹۹۱۵۳۰۳۳۰۸", code: "63" },
    { id: "attendance-64", name: "رضا نیک نام", phone: "۰۹۳۰۸۹۳۴۴۸۳", code: "64" },
    { id: "attendance-65", name: "محمد مهدی قربانی", phone: "۰۹۱۲۵۴۰۸۱۹۰", code: "65" },
    { id: "attendance-66", name: "علی گنج پرور", phone: "۰۹۱۴۴۳۳۱۶۷۶", code: "66" },
    { id: "attendance-67", name: "کامران شهبازی", phone: "۰۹۰۱۷۹۷۸۷۹۳", code: "67" },
    { id: "attendance-68", name: "سید محمد علی", phone: "۰۹۱۹۷۲۱۵۱۹۹", code: "68" },
    { id: "attendance-69", name: "احمد خراسانی", phone: "۰۹۰۲۷۱۶۸۴۱۲", code: "69" },
    { id: "attendance-70", name: "مجید همت", phone: "۰۹۳۳۱۱۲۱۹۳۴", code: "70" },
    { id: "attendance-71", name: "میلاد الله دادیان", phone: "۰۹۱۳۸۷۲۸۰۴۷", code: "71" },
    { id: "attendance-73", name: "یزدان حبیبی", phone: "۰۹۱۹۶۶۷۲۹۱۹", code: "73" },
    { id: "attendance-74", name: "جواد نعمتی والا", phone: "۰۹۱۸۶۰۹۴۵۴۷", code: "74" },
    { id: "attendance-100", name: "مهدی عزیز زاده", phone: "۰۹۳۵۱۰۶۳۱۸۸", code: "100" },
    { id: "attendance-102", name: "مصطفی شیرزاد", phone: "۰۹۳۸۵۰۱۴۷۱۱", code: "102" },
    { id: "attendance-103", name: "مهرداد کمالی", phone: "۰۹۳۵۸۸۵۹۲۲۱", code: "103" },
    { id: "attendance-104", name: "شهرام فرهادنژاد", phone: "۰۹۳۳۸۲۱۱۱۳۸", code: "104" },
    { id: "attendance-105", name: "ابراهیم ابراهیمی", phone: "۰۹۱۴۵۱۶۳۸۵۴", code: "105" },
    { id: "attendance-106", name: "فرشاد صمیمی", phone: "۰۹۹۲۴۶۱۴۸۸۶", code: "106" },
    { id: "attendance-107", name: "مرتضی مظفری زاد", phone: "۰۹۱۹۰۰۵۴۷۶۰", code: "107" },
    { id: "attendance-150", name: "پیمان سلیمی مقدم", phone: "۰۹۱۹۳۱۶۰۱۹۸", code: "150" },
    { id: "attendance-151", name: "جعفر خزائی", phone: "۰۹۹۲۶۲۲۲۱۵۳", code: "151" },
    { id: "attendance-152", name: "سعید خادمی", phone: "۰۹۱۲۸۳۰۱۰۹۶", code: "152" },
    { id: "attendance-153", name: "مهدی ترکمانی", phone: "۰۹۳۵۵۷۳۰۵۴۴", code: "153" },
    { id: "attendance-154", name: "مهدی زارعی", phone: "۰۹۲۲۳۷۳۵۹۹۸", code: "154" },
    { id: "attendance-155", name: "اکبر اعجازی کهلان", phone: "۰۹۲۱۴۵۱۴۹۳۰", code: "155" },
    { id: "attendance-156", name: "رضا مهری حسین", phone: "۰۹۹۶۳۶۳۱۵۶۴", code: "156" },
    { id: "attendance-157", name: "علی رضائی", phone: "۰۹۱۹۵۱۵۳۶۱۸", code: "157" },
    { id: "attendance-158", name: "رضا نقوی", phone: "۰۹۱۴۹۲۱۱۰۰۳", code: "158" },
    { id: "attendance-159", name: "بهادر ترابخانی", phone: "۰۹۱۰۹۷۷۸۷۴۸", code: "159" },
    { id: "attendance-160", name: "رضا فتاحی", phone: "۰۹۰۱۴۴۰۴۲۳۴", code: "160" },
    { id: "attendance-161", name: "علیرضا پرویزی", phone: "۰۹۱۹۰۸۱۴۷۱۵", code: "161" },
    { id: "attendance-200", name: "هیروش رحمتی", phone: "۰۹۰۴۶۲۷۷۱۰۵", code: "200" },
    { id: "attendance-201", name: "محمد ریزان مرادی", phone: "۰۹۱۹۴۴۳۵۶۳۳", code: "201" },
    { id: "attendance-202", name: "محمد مرادی", phone: "۰۹۹۶۶۵۶۵۹۸۸", code: "202" },
    { id: "attendance-500", name: "کیهان ناصری", phone: "۰۹۳۵۲۲۴۲۳۶۸", code: "500" },
    { id: "attendance-501", name: "فرزاد رضایی", phone: "", code: "501" },
  ],
  assignments: [
    { vehicleId: "v0", driverId: "attendance-1" },
    { vehicleId: "v1", driverId: "attendance-2" },
    { vehicleId: "v2", driverId: "attendance-4" },
    { vehicleId: "v3", driverId: "attendance-5" },
    { vehicleId: "v4", driverId: null }, // خاور کد 6 بدون راننده (طبق گزارش جدید)
    { vehicleId: "v5", driverId: "attendance-7" }, // خاور کد 7 محسن مقدسی / علی کشاورز
    { vehicleId: "v6", driverId: "attendance-8" },
    { vehicleId: "v7", driverId: "attendance-9" },
    { vehicleId: "v8", driverId: null }, // خاور کد 10 بدون راننده
    { vehicleId: "v9", driverId: "attendance-11" },
    { vehicleId: "v10", driverId: "attendance-12" },
    { vehicleId: "v11", driverId: "attendance-13" },
    { vehicleId: "v12", driverId: "attendance-14" },
    { vehicleId: "v13", driverId: "attendance-15" },
    { vehicleId: "v14", driverId: "attendance-17" },
    { vehicleId: "v15", driverId: "attendance-18" },
    { vehicleId: "v19", driverId: "attendance-50" },
    { vehicleId: "v20", driverId: "attendance-51" },
    { vehicleId: "v21", driverId: null }, // هیوندا کد 52 بدون راننده
    { vehicleId: "v22", driverId: "attendance-53" },
    { vehicleId: "v23", driverId: "attendance-54" },
    { vehicleId: "v24", driverId: "attendance-55" },
    { vehicleId: "v25", driverId: "attendance-56" },
    { vehicleId: "v26", driverId: "attendance-57" },
    { vehicleId: "v27", driverId: null }, // هیوندا کد 58 بدون راننده
    { vehicleId: "v28", driverId: "attendance-59" },
    { vehicleId: "v29", driverId: "attendance-60" },
    { vehicleId: "v30", driverId: "attendance-61" },
    { vehicleId: "v31", driverId: "attendance-62" },
    { vehicleId: "v32", driverId: "attendance-63" },
    { vehicleId: "v33", driverId: "attendance-64" },
    { vehicleId: "v34", driverId: "attendance-65" },
    { vehicleId: "v35", driverId: "attendance-66" },
    { vehicleId: "v36", driverId: "attendance-67" },
    { vehicleId: "v37", driverId: "attendance-68" },
    { vehicleId: "v38", driverId: "attendance-69" },
    { vehicleId: "v39", driverId: "attendance-70" },
    { vehicleId: "v40", driverId: "attendance-71" },
    { vehicleId: "v41", driverId: "attendance-73" },
    { vehicleId: "v42", driverId: "attendance-74" },
    { vehicleId: "v44", driverId: "attendance-100" },
    { vehicleId: "v45", driverId: null }, // ایسوزو کد 101 بدون راننده
    { vehicleId: "v46", driverId: "attendance-102" },
    { vehicleId: "v47", driverId: "attendance-103" },
    { vehicleId: "v48", driverId: "attendance-104" },
    { vehicleId: "v49", driverId: "attendance-105" },
    { vehicleId: "v50", driverId: "attendance-106" },
    { vehicleId: "v51", driverId: "attendance-107" },
    { vehicleId: "v53", driverId: "attendance-150" },
    { vehicleId: "v54", driverId: "attendance-151" },
    { vehicleId: "v55", driverId: "attendance-152" },
    { vehicleId: "v56", driverId: "attendance-153" },
    { vehicleId: "v57", driverId: "attendance-154" },
    { vehicleId: "v58", driverId: "attendance-155" },
    { vehicleId: "v59", driverId: "attendance-156" },
    { vehicleId: "v60", driverId: "attendance-157" },
    { vehicleId: "v61", driverId: "attendance-158" },
    { vehicleId: "v62", driverId: "attendance-159" },
    { vehicleId: "v63", driverId: "attendance-160" },
    { vehicleId: "v64", driverId: "attendance-161" },
    { vehicleId: "v65", driverId: "attendance-200" },
    { vehicleId: "v66", driverId: "attendance-201" },
    { vehicleId: "v67", driverId: "attendance-202" },
    { vehicleId: "v68", driverId: "attendance-202" }, // موتور 250 محمد مرادی
    { vehicleId: "v69", driverId: null }, // موتور 251 بدون راننده
    { vehicleId: "v70", driverId: "attendance-500" },
    { vehicleId: "v71", driverId: "attendance-501" },
    { vehicleId: "v72", driverId: "attendance-501" }, // فرزاد رضایی
  ],
  rules: {
    KHAAVAR: { label: "خاور بنز", hasMileage: false, maxTrips: 80, maxDays: 60 },
    HYUNDAI: { label: "هیوندا", hasMileage: true, maxMileage: 5000, maxTrips: 60, maxDays: 45 },
    ISUZU: { label: "ایسوزو ۵.۲", hasMileage: true, maxMileage: 5000, maxTrips: 80, maxDays: 45 },
    NISSAN: { label: "نیسان", hasMileage: true, maxMileage: 5000, maxTrips: 50, maxDays: 30 },
    INSPECTOR_CAR: { label: "خودرو بازرس", hasMileage: true, maxMileage: 7000, maxDays: 180 },
    INSPECTOR_MOTOR: { label: "موتور بازرس", hasMileage: true, maxMileage: 3000, maxDays: 180 },
    SEDAN: { label: "سواری", hasMileage: true, maxMileage: 5000, maxDays: 180 },
    PEUGEOT: { label: "پژو", hasMileage: true, maxMileage: 5000, maxDays: 180 },
  },
  driverState: {
    version: 3,
    drivers: [
      { id: "driver-5p2k66zi0-1790720265936", name: "رحیم بدرلو", code: "1" },
      { id: "driver-lfody5hp7-1790720265937", name: "بهروز حیدری", code: "2" },
      { id: "driver-k0eotmjo9-1790720265937", name: "سید اقبال هدیه", code: "4" },
      { id: "driver-sahih1h31-1790720265937", name: "نادر صابون پز", code: "5" },
      { id: "driver-53cbm062w-1790720265937", name: "محسن مقدسی", code: "6" },
      { id: "driver-pndc2fma8-1790720265937", name: "محسن مقدسی / علی کشاورز", code: "7" },
      { id: "driver-iiz5vdpg5-1790720265937", name: "مهدی رضائی ده", code: "8" },
      { id: "driver-1q5bdueul-1790720265937", name: "امین تندیس", code: "9" },
      { id: "driver-k62id2501-1790720265937", name: "حمید خاکی", code: "11" },
      { id: "driver-8srbszdlo-1790720265937", name: "وحید محمودی", code: "12" },
      { id: "driver-ybjurzexu-1790720265937", name: "عبداله فرامرزی", code: "13" },
      { id: "driver-slbd7kq8u-1790720265937", name: "اکبر فاروغی", code: "14" },
      { id: "driver-iupdso9br-1790720265937", name: "مرتضی نادری", code: "15" },
      { id: "driver-ktw9yq9q4-1790720265937", name: "علی خرمی", code: "17" },
      { id: "driver-n4b8iuqd9-1790720265937", name: "رسول رحمان زاد", code: "18" },
      { id: "driver-7rm9c0hg5-1790720265937", name: "سید مجتبی", code: "50" },
      { id: "driver-5gybb494m-1790720265937", name: "مجتبی رضایی", code: "51" },
      { id: "driver-5an45cmme-1790720265937", name: "مهدی باقری", code: "53" },
      { id: "driver-m6yjqj9a8-1790720265937", name: "نادر حسابی نامقی", code: "54" },
      { id: "driver-tsettbd4e-1790720265937", name: "عباس بیراوند", code: "55" },
      { id: "driver-l49qtf14f-1790720265937", name: "منوچهر سلیمی پور", code: "56" },
      { id: "driver-ya3vws5qn-1790720265937", name: "علیرضا پور ابراهیم", code: "57" },
      { id: "driver-soeb999p2-1790720265937", name: "محمد صدیق عباسی", code: "59" },
      { id: "driver-ozyq98x7e-1790720265937", name: "حسین شهنازی", code: "60" },
      { id: "driver-wtoim71nu-1790720265937", name: "یوسف نامی زاده", code: "61" },
      { id: "driver-gzwwayhc2-1790720265937", name: "مجتبی علی آبادی", code: "62" },
      { id: "driver-wo3bdo2et-1790720265937", name: "حسین سیاح", code: "63" },
      { id: "driver-69a7zrbce-1790720265937", name: "رضا نیک نام", code: "64" },
      { id: "driver-j9uxgknxb-1790720265937", name: "محمد مهدی قربانی", code: "65" },
      { id: "driver-wm6lh9101-1790720265937", name: "علی گنج پرور", code: "66" },
      { id: "driver-hivueyomb-1790720265937", name: "کامران شهبازی", code: "67" },
      { id: "driver-vbaddj2aq-1790720265937", name: "سید محمد علی", code: "68" },
      { id: "driver-6klfguu7z-1790720265937", name: "احمد خراسانی", code: "69" },
      { id: "driver-8wxv3vrms-1790720265937", name: "مجید همت", code: "70" },
      { id: "driver-f2av1dlw4-1790720265937", name: "میلاد الله دادیان", code: "71" },
      { id: "driver-7jjr3pmyk-1790720265937", name: "یزدان حبیبی", code: "73" },
      { id: "driver-zti9in2te-1790720265937", name: "جواد نعمتی والا", code: "74" },
      { id: "driver-0mzzztlba-1790720265937", name: "مهدی عزیز زاده", code: "100" },
      { id: "driver-0f4waqic2-1790720265937", name: "مصطفی شیرزاد", code: "102" },
      { id: "driver-4hsqyyyzs-1790720265937", name: "مهرداد کمالی", code: "103" },
      { id: "driver-zuburkcys-1790720265937", name: "شهرام فرهادنژاد", code: "104" },
      { id: "driver-jkn063p48-1790720265937", name: "ابراهیم ابراهیمی", code: "105" },
      { id: "driver-bkz0b9pul-1790720265937", name: "فرشاد صمیمی", code: "106" },
      { id: "driver-m8exp4fne-1790720265937", name: "مرتضی مظفری زاد", code: "107" },
      { id: "driver-8eypxze90-1790720265937", name: "پیمان سلیمی مقدم", code: "150" },
      { id: "driver-2mh5qww5c-1790720265937", name: "جعفر خزائی", code: "151" },
      { id: "driver-a9on9tdib-1790720265937", name: "سعید خادمی", code: "152" },
      { id: "driver-yddrq2chh-1790720265937", name: "مهدی ترکمانی", code: "153" },
      { id: "driver-9er0gy1ef-1790720265937", name: "مهدی زارعی", code: "154" },
      { id: "driver-9qyo0qmt8-1790720265937", name: "اکبر اعجازی کهلان", code: "155" },
      { id: "driver-xqz965l9f-1790720265937", name: "رضا مهری حسین", code: "156" },
      { id: "driver-r285zpz77-1790720265937", name: "علی رضائی", code: "157" },
      { id: "driver-sy5oat50t-1790720265937", name: "رضا نقوی", code: "158" },
      { id: "driver-qnmf96a0x-1790720265937", name: "بهادر ترابخانی", code: "159" },
      { id: "driver-odb1tla63-1790720265937", name: "رضا فتاحی", code: "160" },
      { id: "driver-655e19j14-1790720265937", name: "علیرضا پرویزی", code: "161" },
      { id: "driver-oi9279y7n-1790720265937", name: "هیروش رحمتی", code: "200" },
      { id: "driver-wl13na6wm-1790720265937", name: "محمد ریزان مرادی", code: "201" },
      { id: "driver-9wq9sx9re-1790720265937", name: "محمد مرادی", code: "202" },
      { id: "driver-500-1790720265937", name: "کیهان ناصری", code: "500" },
      { id: "driver-501-1790720265937", name: "فرزاد رضایی", code: "501" },
    ],
    records: {
      "driver-soeb999p2-1790720265937-1405-06-17": "م",
      "driver-bkz0b9pul-1790720265937-1405-06-04": "م",
      "driver-bkz0b9pul-1790720265937-1405-06-05": "م",
      "driver-bkz0b9pul-1790720265937-1405-06-06": "م",
      "driver-bkz0b9pul-1790720265937-1405-06-07": "م",
      "driver-bkz0b9pul-1790720265937-1405-06-08": "م",
      "driver-bkz0b9pul-1790720265937-1405-06-09": "م",
      "driver-sahih1h31-1790720265937-1405-06-07": "م",
      "driver-sahih1h31-1790720265937-1405-06-08": "م",
      "driver-bkz0b9pul-1790720265937-1405-06-03": "م",
      "driver-wo3bdo2et-1790720265937-1405-06-01": "م",
      "driver-wo3bdo2et-1790720265937-1405-06-02": "م",
      "driver-wo3bdo2et-1790720265937-1405-06-03": "م",
      "driver-5gybb494m-1790720265937-1405-06-02": "م",
      "driver-5gybb494m-1790720265937-1405-06-03": "م",
      "driver-5gybb494m-1790720265937-1405-06-04": "م",
      "driver-lfody5hp7-1790720265937-1405-06-02": "م",
      "driver-lfody5hp7-1790720265937-1405-06-03": "م",
      "driver-lfody5hp7-1790720265937-1405-06-04": "م",
      "driver-zti9in2te-1790720265937-1405-06-01": "م",
      "driver-zti9in2te-1790720265937-1405-06-02": "م",
      "driver-zti9in2te-1790720265937-1405-06-03": "م",
      "driver-lfody5hp7-1790720265937-1405-06-07": "م",
      "driver-tsettbd4e-1790720265937-1405-06-14": "م",
      "driver-tsettbd4e-1790720265937-1405-06-15": "م",
      "driver-tsettbd4e-1790720265937-1405-06-16": "م",
      "driver-tsettbd4e-1790720265937-1405-06-17": "م",
      "driver-m6yjqj9a8-1790720265937-1405-06-10": "م",
      "driver-m6yjqj9a8-1790720265937-1405-06-11": "م",
      "driver-m6yjqj9a8-1790720265937-1405-06-12": "م",
      "driver-8eypxze90-1790720265937-1405-06-04": "م",
      "driver-8eypxze90-1790720265937-1405-06-05": "م",
      "driver-8eypxze90-1790720265937-1405-06-06": "م",
      "driver-8eypxze90-1790720265937-1405-06-07": "م",
      "driver-soeb999p2-1790720265937-1405-06-01": "م",
      "driver-soeb999p2-1790720265937-1405-06-02": "م",
      "driver-soeb999p2-1790720265937-1405-06-03": "م",
      "driver-wo3bdo2et-1790720265937-1405-06-04": "م",
      "driver-5cp0lasid-1790720265937-1405-06-04": "م",
      "driver-soeb999p2-1790720265937-1405-06-04": "م",
      "driver-zti9in2te-1790720265937-1405-06-04": "م",
      "driver-j9uxgknxb-1790720265937-1405-06-04": "م",
      "driver-wo3bdo2et-1790720265937-1405-06-05": "م",
      "driver-5gybb494m-1790720265937-1405-06-05": "م",
      "driver-5cp0lasid-1790720265937-1405-06-05": "م",
      "driver-soeb999p2-1790720265937-1405-06-05": "م",
      "driver-zti9in2te-1790720265937-1405-06-05": "م",
      "driver-j9uxgknxb-1790720265937-1405-06-05": "م",
      "driver-5gybb494m-1790720265937-1405-06-06": "م",
      "driver-ktw9yq9q4-1790720265937-1405-06-07": "م",
      "driver-sahih1h31-1790720265937-1405-06-09": "م",
      "driver-4hsqyyyzs-1790720265937-1405-06-09": "م",
      "driver-m8exp4fne-1790720265937-1405-06-09": "م",
      "driver-5cp0lasid-1790720265937-1405-06-10": "م",
      "driver-8eypxze90-1790720265937-1405-06-10": "م",
      "driver-4hsqyyyzs-1790720265937-1405-06-10": "م",
      "driver-bkz0b9pul-1790720265937-1405-06-10": "م",
      "driver-m8exp4fne-1790720265937-1405-06-10": "م",
      "driver-5cp0lasid-1790720265937-1405-06-11": "م",
      "driver-ya3vws5qn-1790720265937-1405-06-11": "م",
      "driver-bkz0b9pul-1790720265937-1405-06-12": "م",
      "driver-bkz0b9pul-1790720265937-1405-06-11": "م",
      "driver-m8exp4fne-1790720265937-1405-06-11": "م",
      "driver-5cp0lasid-1790720265937-1405-06-12": "م",
      "driver-8eypxze90-1790720265937-1405-06-12": "م",
      "driver-8eypxze90-1790720265937-1405-06-11": "م",
      "driver-ya3vws5qn-1790720265937-1405-06-12": "م",
      "driver-m8exp4fne-1790720265937-1405-06-12": "م",
      "driver-1q5bdueul-1790720265937-1405-06-14": "م",
      "driver-1q5bdueul-1790720265937-1405-06-15": "م",
      "driver-1q5bdueul-1790720265937-1405-06-16": "م",
      "driver-1q5bdueul-1790720265937-1405-06-17": "م",
      "driver-jkn063p48-1790720265937-1405-06-14": "م",
      "driver-jkn063p48-1790720265937-1405-06-15": "م",
      "driver-jkn063p48-1790720265937-1405-06-16": "م",
      "driver-jkn063p48-1790720265937-1405-06-17": "م",
      "driver-jkn063p48-1790720265937-1405-06-18": "م",
      "driver-wm6lh9101-1790720265937-1405-06-14": "م",
      "driver-wm6lh9101-1790720265937-1405-06-15": "م",
      "driver-wm6lh9101-1790720265937-1405-06-16": "م",
      "driver-wm6lh9101-1790720265937-1405-06-17": "م",
      "driver-wm6lh9101-1790720265937-1405-06-18": "م",
      "driver-wm6lh9101-1790720265937-1405-06-19": "م",
      "driver-wm6lh9101-1790720265937-1405-06-20": "م",
      "driver-wm6lh9101-1790720265937-1405-06-21": "م",
      "driver-wm6lh9101-1790720265937-1405-06-22": "م",
      "driver-wm6lh9101-1790720265937-1405-06-23": "م",
      "driver-5an45cmme-1790720265937-1405-06-17": "م",
      "driver-0mzzztlba-1790720265937-1405-06-17": "م",
      "driver-bkz0b9pul-1790720265937-1405-06-17": "م",
      "driver-r285zpz77-1790720265937-1405-06-17": "م",
      "driver-slbd7kq8u-1790720265937-1405-06-16": "م",
      "driver-slbd7kq8u-1790720265937-1405-06-17": "م",
      "driver-slbd7kq8u-1790720265937-1405-06-18": "م",
      "driver-slbd7kq8u-1790720265937-1405-06-19": "م",
      "driver-slbd7kq8u-1790720265937-1405-06-20": "م",
      "driver-slbd7kq8u-1790720265937-1405-06-21": "م",
      "driver-slbd7kq8u-1790720265937-1405-06-22": "م",
      "driver-slbd7kq8u-1790720265937-1405-06-24": "م",
      "driver-slbd7kq8u-1790720265937-1405-06-26": "م",
      "driver-slbd7kq8u-1790720265937-1405-06-25": "م",
      "driver-slbd7kq8u-1790720265937-1405-06-23": "م",
      "driver-5an45cmme-1790720265937-1405-06-16": "م",
      "driver-5an45cmme-1790720265937-1405-06-18": "م",
      "driver-soeb999p2-1790720265937-1405-06-18": "م",
      "driver-soeb999p2-1790720265937-1405-06-19": "م",
      "driver-wtoim71nu-1790720265937-1405-06-14": "م",
      "driver-7jjr3pmyk-1790720265937-1405-06-21": "م",
      "driver-7jjr3pmyk-1790720265937-1405-06-22": "م",
      "driver-7jjr3pmyk-1790720265937-1405-06-23": "م",
      "driver-7jjr3pmyk-1790720265937-1405-06-24": "م",
      "driver-7jjr3pmyk-1790720265937-1405-06-25": "م",
      "driver-f2av1dlw4-1790720265937-1405-06-21": "م",
      "driver-f2av1dlw4-1790720265937-1405-06-22": "م",
      "driver-f2av1dlw4-1790720265937-1405-06-23": "م",
      "driver-f2av1dlw4-1790720265937-1405-06-24": "م",
      "driver-f2av1dlw4-1790720265937-1405-06-25": "م",
      "driver-f2av1dlw4-1790720265937-1405-06-26": "م",
      "driver-sahih1h31-1790720265937-1405-06-06": "م",
      "driver-7rm9c0hg5-1790720265937-1405-06-17": "م",
      "driver-k9p79io62-1789257120321-1405-06-15": "م",
      "driver-k9p79io62-1789257120321-1405-06-16": "م",
      "driver-k9p79io62-1789257120321-1405-06-17": "م",
      "driver-m6yjqj9a8-1790720265937-1405-06-18": "م",
      "driver-ya3vws5qn-1790720265937-1405-06-16": "م",
      "driver-ya3vws5qn-1790720265937-1405-06-18": "م",
      "driver-ya3vws5qn-1790720265937-1405-06-17": "م",
      "driver-ya3vws5qn-1790720265937-1405-06-19": "م",
      "driver-ya3vws5qn-1790720265937-1405-06-20": "م",
      "driver-ya3vws5qn-1790720265937-1405-06-21": "م",
      "driver-ya3vws5qn-1790720265937-1405-06-10": "م",
      "driver-soeb999p2-1790720265937-1405-06-20": "م",
      "driver-soeb999p2-1790720265937-1405-06-21": "م",
      "driver-wtoim71nu-1790720265937-1405-06-19": "م",
      "driver-j9uxgknxb-1790720265937-1405-06-17": "م",
      "driver-j9uxgknxb-1790720265937-1405-06-12": "م",
      "driver-8wxv3vrms-1790720265937-1405-06-07": "م",
      "driver-lfody5hp7-1790720265937-1405-06-13": "م",
      "driver-t1hnx6wdx-1790720265937-1405-06-09": "م",
      "driver-t1hnx6wdx-1790720265937-1405-06-10": "م",
      "driver-4hsqyyyzs-1790720265937-1405-06-06": "م",
      "driver-4hsqyyyzs-1790720265937-1405-06-07": "م",
      "driver-4hsqyyyzs-1790720265937-1405-06-08": "م",
      "driver-zuburkcys-1790720265937-1405-06-17": "م",
      "driver-zuburkcys-1790720265937-1405-06-14": "م",
      "driver-zuburkcys-1790720265937-1405-06-15": "م",
      "driver-zuburkcys-1790720265937-1405-06-09": "م",
      "driver-jkn063p48-1790720265937-1405-06-19": "م",
      "driver-jkn063p48-1790720265937-1405-06-20": "م",
      "driver-jkn063p48-1790720265937-1405-06-21": "م",
      "driver-bkz0b9pul-1790720265937-1405-06-13": "م",
      "driver-bkz0b9pul-1790720265937-1405-06-14": "م",
      "driver-bkz0b9pul-1790720265937-1405-06-15": "م",
      "driver-bkz0b9pul-1790720265937-1405-06-16": "م",
      "driver-a9on9tdib-1790720265937-1405-06-14": "م",
      "driver-9qyo0qmt8-1790720265937-1405-06-17": "م",
      "driver-9qyo0qmt8-1790720265937-1405-06-13": "م",
      "driver-r285zpz77-1790720265937-1405-06-14": "م",
      "driver-r285zpz77-1790720265937-1405-06-15": "م",
      "driver-r285zpz77-1790720265937-1405-06-16": "م",
      "driver-r285zpz77-1790720265937-1405-06-18": "م",
      "driver-r285zpz77-1790720265937-1405-06-19": "م",
      "driver-qnmf96a0x-1790720265937-1405-06-15": "م",
      "driver-jkn063p48-1790720265937-1405-06-22": "م",
      "driver-jkn063p48-1790720265937-1405-06-23": "م",
      "driver-jkn063p48-1790720265937-1405-06-24": "م",
      "driver-7jjr3pmyk-1790720265937-1405-06-26": "م",
      "driver-m6yjqj9a8-1790720265937-1405-06-24": "م",
      "driver-jkn063p48-1790720265937-1405-06-25": "م",
      "driver-5an45cmme-1790720265937-1405-06-25": "م",
      "driver-5an45cmme-1790720265937-1405-06-26": "م",
      "driver-jkn063p48-1790720265937-1405-06-26": "م",
      "driver-m6yjqj9a8-1790720265937-1405-06-26": "م",
      "driver-pndc2fma8-1790720265937-1405-06-17": "م",
      "driver-pndc2fma8-1790720265937-1405-06-21": "م",
      "driver-pndc2fma8-1790720265937-1405-06-22": "م",
      "driver-69a7zrbce-1790720265937-1405-06-03": "م",
      "driver-69a7zrbce-1790720265937-1405-06-02": "م",
      "driver-69a7zrbce-1790720265937-1405-06-04": "م",
      "driver-69a7zrbce-1790720265937-1405-06-05": "م",
      "driver-69a7zrbce-1790720265937-1405-06-16": "م",
      "driver-69a7zrbce-1790720265937-1405-06-17": "م",
      "driver-69a7zrbce-1790720265937-1405-06-24": "م",
      "driver-hivueyomb-1790720265937-1405-06-07": "م",
      "driver-hivueyomb-1790720265937-1405-06-08": "م",
      "driver-hivueyomb-1790720265937-1405-06-09": "م",
      "driver-hivueyomb-1790720265937-1405-06-10": "م",
      "driver-hivueyomb-1790720265937-1405-06-11": "م",
      "driver-vbaddj2aq-1790720265937-1405-06-07": "م",
      "driver-vbaddj2aq-1790720265937-1405-06-08": "م",
      "driver-vbaddj2aq-1790720265937-1405-06-09": "م",
      "driver-vbaddj2aq-1790720265937-1405-06-10": "م",
      "driver-vbaddj2aq-1790720265937-1405-06-11": "م",
      "driver-vbaddj2aq-1790720265937-1405-06-12": "م",
      "driver-vbaddj2aq-1790720265937-1405-06-13": "م",
      "driver-vbaddj2aq-1790720265937-1405-06-14": "م",
      "driver-t1hnx6wdx-1790720265937-1405-06-27": "م",
      "driver-t1hnx6wdx-1790720265937-1405-06-26": "م",
      "driver-t1hnx6wdx-1790720265937-1405-06-25": "م",
      "driver-t1hnx6wdx-1790720265937-1405-06-24": "م",
      "driver-t1hnx6wdx-1790720265937-1405-06-23": "م",
      "driver-5an45cmme-1790720265937-1405-06-27": "م",
      "driver-m6yjqj9a8-1790720265937-1405-06-27": "م",
      "driver-5an45cmme-1790720265937-1405-06-28": "م",
      "driver-4hsqyyyzs-1790720265937-1405-06-28": "م",
      "driver-wm6lh9101-1790720265937-1405-06-28": "م",
      "driver-sy5oat50t-1790720265937-1405-06-28": "م",
      "driver-sy5oat50t-1790720265937-1405-07-02": "م",
      "driver-sy5oat50t-1790720265937-1405-07-01": "م",
      "driver-6klfguu7z-1790720265937-1405-07-01": "م",
      "driver-6klfguu7z-1790720265937-1405-07-02": "م",
      "driver-qnmf96a0x-1790720265937-1405-07-01": "م",
      "driver-r285zpz77-1790720265937-1405-07-01": "م",
      "driver-pndc2fma8-1790720265937-1405-07-01": "م",
      "driver-pndc2fma8-1790720265937-1405-07-02": "م",
      "driver-jkn063p48-1790720265937-1405-07-01": "م",
      "driver-sy5oat50t-1790720265937-1405-07-03": "م",
      "driver-gzwwayhc2-1790720265937-1405-07-02": "م",
      "driver-0f4waqic2-1790720265937-1405-07-02": "م",
      "driver-ya3vws5qn-1790720265937-1405-07-04": "م",
      "driver-ya3vws5qn-1790720265937-1405-07-05": "م",
      "driver-ktw9yq9q4-1790720265937-1405-07-05": "م",
      "driver-ktw9yq9q4-1790720265937-1405-07-06": "م",
      "driver-ktw9yq9q4-1790720265937-1405-07-07": "م",
      "driver-ktw9yq9q4-1790720265937-1405-07-08": "م",
      "driver-zuburkcys-1790720265937-1405-07-05": "م",
      "driver-m6yjqj9a8-1790720265937-1405-07-05": "م",
      "driver-9qyo0qmt8-1790720265937-1405-07-05": "م",
      "driver-a9on9tdib-1790720265937-1405-07-05": "م",
      "driver-m8exp4fne-1790720265937-1405-07-04": "م",
      "driver-m8exp4fne-1790720265937-1405-07-03": "م",
      "driver-a9on9tdib-1790720265937-1405-07-06": "م",
      "driver-9qyo0qmt8-1790720265937-1405-07-06": "م",
      "driver-zuburkcys-1790720265937-1405-07-06": "م",
      "driver-7jjr3pmyk-1790720265937-1405-07-05": "م",
      "driver-5an45cmme-1790720265937-1405-07-05": "م",
      "driver-5p2k66zi0-1790720265936-1405-07-05": "م",
      "driver-5an45cmme-1790720265937-1405-07-06": "م",
      "driver-0f4waqic2-1790720265937-1405-07-06": "م",
      "driver-f2av1dlw4-1790720265937-1405-07-06": "م",
      "driver-pndc2fma8-1790720265937-1405-07-06": "م",
      "driver-5cp0lasid-1790720265937-1405-07-07": "م",
      "driver-5an45cmme-1790720265937-1405-07-07": "م",
      "driver-69a7zrbce-1790720265937-1405-07-07": "م",
      "driver-0f4waqic2-1790720265937-1405-07-07": "م",
      "driver-69a7zrbce-1790720265937-1405-07-05": "م",
      "driver-hivueyomb-1790720265937-1405-07-08": "م",
      "driver-69a7zrbce-1790720265937-1405-07-08": "م",
      "driver-sahih1h31-1790720265937-1405-07-11": "م",
      "driver-m6yjqj9a8-1790720265937-1405-07-11": "م",
      "driver-tsettbd4e-1790720265937-1405-07-11": "م",
      "driver-ozyq98x7e-1790720265937-1405-07-11": "م",
      "driver-6klfguu7z-1790720265937-1405-07-11": "م",
      "driver-0f4waqic2-1790720265937-1405-07-11": "م",
      "driver-5p2k66zi0-1790720265936-1405-07-11": "م",
      "driver-5p2k66zi0-1790720265936-1405-07-12": "م",
      "driver-zuburkcys-1790720265937-1405-07-11": "م",
      "driver-zuburkcys-1790720265937-1405-07-12": "م",
      "driver-9qyo0qmt8-1790720265937-1405-07-12": "م",
      "driver-1q5bdueul-1790720265937-1405-07-12": "م",
      "driver-soeb999p2-1790720265937-1405-07-12": "م",
      "driver-ozyq98x7e-1790720265937-1405-07-12": "م",
      "driver-wo3bdo2et-1790720265937-1405-07-12": "م",
      "driver-j9uxgknxb-1790720265937-1405-07-12": "م",
      "driver-wm6lh9101-1790720265937-1405-07-12": "م",
      "driver-6klfguu7z-1790720265937-1405-07-12": "م",
      "driver-iupdso9br-1790720265937-1405-07-12": "ت",
      "driver-0f4waqic2-1790720265937-1405-07-12": "ت",
      "driver-bkz0b9pul-1790720265937-1405-07-12": "ت",
      "driver-m8exp4fne-1790720265937-1405-07-12": "ت",
      "driver-sahih1h31-1790720265937-1405-07-13": "م",
      "driver-soeb999p2-1790720265937-1405-07-13": "م",
      "driver-ozyq98x7e-1790720265937-1405-07-13": "م",
      "driver-wo3bdo2et-1790720265937-1405-07-13": "م",
      "driver-j9uxgknxb-1790720265937-1405-07-13": "م",
      "driver-6klfguu7z-1790720265937-1405-07-13": "م",
      "driver-ybjurzexu-1790720265937-1405-07-13": "ت",
      "driver-zuburkcys-1790720265937-1405-07-13": "ت",
      "driver-m8exp4fne-1790720265937-1405-07-13": "ت",
      "driver-ybjurzexu-1790720265937-1405-07-14": "ت",
      "driver-zuburkcys-1790720265937-1405-07-14": "ت",
      "driver-ozyq98x7e-1790720265937-1405-07-14": "م",
      "driver-wo3bdo2et-1790720265937-1405-07-14": "م",
      "driver-69a7zrbce-1790720265937-1405-07-14": "م",
      "driver-jkn063p48-1790720265937-1405-07-14": "م",
      "driver-wm6lh9101-1790720265937-1405-07-05": "ت",
      "driver-ozyq98x7e-1790720265937-1405-07-15": "م",
      "driver-wo3bdo2et-1790720265937-1405-07-15": "م",
      "driver-jkn063p48-1790720265937-1405-07-15": "م",
      "driver-vbaddj2aq-1790720265937-1405-07-15": "ت",
    },
    notes: {
      "driver-69a7zrbce-1790720265937-1405-07-05": "برای دستش رفت دکتر"
    },
    view: { year: 1405, month: 7, day: 12 }
  },
  staffDirectory: {
    version: 1,
    employees: [
      { id: "employee-mukor098-lsnp5p", name: "حسام الدین رضایی", code: "5001", unit: "اعزام", position: "مدیر دیسپچ", shift: "night", active: true },
      { id: "employee-muljnapj-5m9e68", name: "وصال", code: "5002", unit: "اعزام", position: "سرپرست شیفت", shift: "night", active: true },
      { id: "employee-muljnzu0-z0gc0b", name: "محمد اسدی", code: "5003", unit: "اعزام", position: "کارشناس دیسپچ", shift: "night", active: true },
    ]
  },
  staffAttendance: {
    version: 1,
    view: { year: 1405, month: 7, day: 7 },
    records: {
      "employee-muljnzu0-z0gc0b|1405-07-04": "leave",
      "employee-muljnzu0-z0gc0b|1405-07-05": "leave"
    }
  }
};

/**
 * Normalizes vehicle type string to application VehicleItem.vehicleType
 */
function normalizeVehicleType(rawType: string | null | undefined): VehicleItem['vehicleType'] {
  if (!rawType) return 'CAR';
  const upper = String(rawType).toUpperCase();
  if (upper.includes('KHAAVAR')) return 'KHAAVAR';
  if (upper.includes('HYUNDAI')) return 'HYUNDAI';
  if (upper.includes('ISUZU')) return 'ISUZU';
  if (upper.includes('NISSAN')) return 'NISSAN';
  if (upper.includes('VAN')) return 'VAN';
  if (upper.includes('PICKUP')) return 'PICKUP';
  return 'CAR';
}

/**
 * Universal Decoder: Parses both legacy backups and the latest 8-unified format
 */
export function decodeBackupData(payload: any = RAW_BACKUP_PAYLOAD): DecodedBackupResult {
  const isUnifiedFormat = payload && (payload.vehicles || payload.driverState || payload.assignments);

  if (!isUnifiedFormat) {
    // If it's standard v4 format with payload.data
    const src = payload?.data || payload;
    return {
      vehicles: Array.isArray(src.vehicles) ? src.vehicles : [],
      drivers: Array.isArray(src.drivers) ? src.drivers : [],
      driverDirectory: Array.isArray(src.driverDirectory) ? src.driverDirectory : [],
      records: src.records || {},
      staffMembers: Array.isArray(src.staffMembers) ? src.staffMembers : [],
      staffRecords: src.staffRecords || {},
      rules: src.serviceRules || {},
    };
  }

  // 1. Build Driver Code Map from driverState and attendance drivers
  const driverCodeToDriverId: Record<string, string> = {};
  const driverStateIdToCode: Record<string, string> = {};
  const driversList: Driver[] = [];
  const driverDirectoryList: DriverDirectoryItem[] = [];

  // Index drivers from driverState
  (payload.driverState?.drivers || []).forEach((d: any) => {
    if (d.id && d.code) {
      driverStateIdToCode[d.id] = String(d.code);
    }
  });

  // Base drivers list from payload.drivers
  (payload.drivers || []).forEach((d: any) => {
    const id = d.id || `drv-${d.code}`;
    const code = String(d.code || '');
    driverCodeToDriverId[code] = id;

    const driverObj: Driver = {
      id,
      name: d.name || `راننده کد ${code}`,
      code,
      personnelCode: code,
      phone: d.phone || '',
      status: d.name ? 'active' : 'inactive',
    };
    driversList.push(driverObj);

    driverDirectoryList.push({
      id,
      name: driverObj.name,
      code,
      phone: driverObj.phone,
      nationalCode: `00${String(12345678 + (parseInt(code, 10) || 1))}`,
      licenseNumber: `LIC-${code}-۹۹`,
      driverType: 'EMPLOYED',
      status: 'AVAILABLE',
      rating: 5.0,
      totalTrips: 42,
      assignedVehicles: [],
      joinedDate: '۱۴۰۵/۰۱/۰۱',
      personnelCode: code,
      tripsCount: 42,
    });
  });

  // Also include any drivers from driverState not yet in driversList
  (payload.driverState?.drivers || []).forEach((d: any) => {
    const code = String(d.code || '');
    if (!driverCodeToDriverId[code] && d.name) {
      const id = d.id;
      driverCodeToDriverId[code] = id;

      const driverObj: Driver = {
        id,
        name: d.name,
        code,
        personnelCode: code,
        status: 'active',
      };
      driversList.push(driverObj);

      driverDirectoryList.push({
        id,
        name: d.name,
        code,
        phone: '',
        nationalCode: `00${String(12345678 + (parseInt(code, 10) || 1))}`,
        licenseNumber: `LIC-${code}-۹۹`,
        driverType: 'EMPLOYED',
        status: 'AVAILABLE',
        rating: 5.0,
        totalTrips: 42,
        assignedVehicles: [],
        joinedDate: '۱۴۰۵/۰۱/۰۱',
        personnelCode: code,
        tripsCount: 42,
      });
    }
  });

  // 2. Build Vehicle-to-Driver assignments
  const vehicleDriverMap: Record<string, { name: string; phone: string; code: string }> = {};
  (payload.assignments || []).forEach((a: any) => {
    if (a.vehicleId && a.driverId) {
      const driver = driversList.find((d) => d.id === a.driverId);
      const vObj = (payload.vehicles || []).find((v: any) => v.id === a.vehicleId);
      if (driver && vObj) {
        driver.vehiclePlate = vObj.plate;
        vehicleDriverMap[a.vehicleId] = {
          name: driver.name,
          phone: driver.phone || '',
          code: driver.code,
        };

        const dirItem = driverDirectoryList.find((dir) => dir.id === a.driverId);
        if (dirItem) {
          dirItem.assignedVehicles = [vObj.plate];
        }
      }
    }
  });

  // 3. Map Vehicles
  const vehiclesList: VehicleItem[] = (payload.vehicles || []).map((v: any, index: number) => {
    const assigned = vehicleDriverMap[v.id];
    const cleanDate = (v.lastChangeDate || '1405/05/01').replace('Persian::', '');
    const vehicleType = normalizeVehicleType(v.type);
    const codeNum = parseInt(v.code, 10) || (index + 1);

    // Default specifications tailored by vehicle type
    let defaultYear = 1395 + (codeNum % 7);
    let defaultChassisType = 'کامیونت مسقف فلزی';
    let defaultColor = 'سفید روغنی';
    let defaultCapacity = '۵.۵ تن';
    if (vehicleType === 'KHAAVAR') {
      defaultChassisType = 'خاور مسقف چادری';
      defaultColor = 'نارنجی بنز';
      defaultCapacity = '۶ تن';
      defaultYear = 1388 + (codeNum % 8);
    } else if (vehicleType === 'HYUNDAI') {
      defaultChassisType = 'هیوندا مسقف ایزوله';
      defaultColor = 'سفید روغنی';
      defaultCapacity = '۵.۲ تن';
      defaultYear = 1393 + (codeNum % 6);
    } else if (vehicleType === 'ISUZU') {
      defaultChassisType = 'ایسوزو ۵.۲ مسقف کانتینری';
      defaultColor = 'سفید متالیک';
      defaultCapacity = '۵.۵ تن';
      defaultYear = 1396 + (codeNum % 6);
    } else if (vehicleType === 'NISSAN') {
      defaultChassisType = 'وانت نیسان زامیاد کفی باری';
      defaultColor = 'آبی زامیاد';
      defaultCapacity = '۲.۲ تن';
      defaultYear = 1398 + (codeNum % 5);
    } else if (vehicleType === 'CAR') {
      if (codeNum === 250 || codeNum === 251) {
        defaultChassisType = 'موتورسیکلت باکسر / هوندا';
        defaultColor = 'مشکی / نقره‌ای';
        defaultCapacity = '۱۵۰ کیلوگرم';
        defaultYear = 1400;
      } else if (codeNum >= 500) {
        defaultChassisType = 'سواری پژو پارس / ۴۰۵';
        defaultColor = 'سفید صدفی';
        defaultCapacity = '۵ سرنشین';
        defaultYear = 1399 + (codeNum % 4);
      } else {
        defaultChassisType = 'سواری پراید وانت / سواری';
        defaultColor = 'سفید روغنی';
        defaultCapacity = '۵ سرنشین';
        defaultYear = 1398;
      }
    }

    const chassisNum = `IR-CH-${String(900000 + codeNum * 137).slice(-6)}`;
    const engineNum = `ENG-${vehicleType.slice(0, 3)}-${String(400000 + codeNum * 211).slice(-6)}`;
    const vinCode = `NAAE${codeNum < 10 ? '0' + codeNum : codeNum}EXG${String(100000 + codeNum * 317)}`;

    return {
      id: v.id || `v-${index}`,
      code: codeNum,
      plateNumber: v.plate || `ایران-${v.code}`,
      vehicleType,
      driverName: assigned?.name || 'بدون راننده',
      driverPhone: assigned?.phone || '',
      driverCode: assigned?.code || '',
      status: 'ACTIVE',
      // مشخصات خودرو
      modelYear: v.modelYear || defaultYear,
      chassisNumber: v.chassisNumber || chassisNum,
      engineNumber: v.engineNumber || engineNum,
      vin: v.vin || vinCode,
      color: v.color || defaultColor,
      chassisType: v.chassisType || defaultChassisType,
      capacityTons: v.capacityTons || defaultCapacity,
      axleCount: vehicleType === 'NISSAN' || vehicleType === 'CAR' ? 2 : 2,
      location: 'پایانه مرکزی حامی',
      group: 'ناوگان دیسپچ',
      documentNumber: `DOC-${codeNum}-۱۴۰۵`,
      documentDate: '۱۴۰۵/۰۱/۱۵',
      insuranceExpiry: normalizePersianDigits(v.insuranceExpiry || ''),
      bodyInsExpiry: normalizePersianDigits(v.bodyInsExpiry || ''),
      inspectionExpiry: normalizePersianDigits(v.inspectionExpiry || '1405/12/29'),
      thirdPartyExpiry: normalizePersianDigits(v.insuranceExpiry || '1406/01/01'),
      insurancePolicyNumber: `INS-۳۳${String(10000 + codeNum * 43)}`,
      insuranceCompany: 'بیمه ایران',
      inspectionNumber: `INSP-۹۹${String(20000 + codeNum * 57)}`,
      currentMileage: Number(v.currentMileage) || 0,
      lastChangeMileage: Number(v.lastChangeMileage) || 0,
      lastChangeDate: cleanDate,
      tripsSinceChange: Number(v.tripsSinceChange) || 0,
      lastOilBrand: 'بهران دیزل سوپر ۱۵W۴۰',
      oilFilterChanged: true,
      airFilterChanged: true,
      fuelFilterChanged: false,
      notes: `خودرو سازمانی کد ${codeNum} - ثبت در سامانه حامی`,
      serviceHistory: Array.isArray(v.serviceHistory)
        ? v.serviceHistory.map((s: any, sIdx: number) => ({
            id: `sh-${index}-${sIdx}`,
            date: s.date || cleanDate,
            mileage: Number(s.mileage) || 0,
            trips: Number(s.trips) || 0,
            oilBrand: 'بهران دیزل سوپر ۱۵W۴۰',
            oilFilterChanged: true,
            airFilterChanged: true,
            fuelFilterChanged: false,
          }))
        : [],
    } as VehicleItem;
  });

  // 4. Decode Attendance Records
  // Records in backup are stored as e.g. "driver-soeb999p2-1790720265937-1405-06-17": "م"
  const recordsMap: AttendanceRecords = {};

  // Initialize for all drivers
  driversList.forEach((d) => {
    recordsMap[d.id] = {};
  });

  const rawRecords = payload.driverState?.records || {};
  Object.keys(rawRecords).forEach((key) => {
    const rawVal = rawRecords[key];
    const status: AttendanceStatus = rawVal === 'م' ? 'leave' : rawVal === 'ت' ? 'workshop' : 'none';

    // Parse key format: "<driverId>-<YYYY>-<MM>-<DD>"
    const match = key.match(/^(driver-[a-z0-9]+-[0-9]+)-(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      const stateDriverId = match[1];
      const y = parseInt(match[2], 10);
      const m = parseInt(match[3], 10);
      const d = parseInt(match[4], 10);

      const code = driverStateIdToCode[stateDriverId];
      const targetDriverId = (code && driverCodeToDriverId[code]) ? driverCodeToDriverId[code] : stateDriverId;

      if (!recordsMap[targetDriverId]) {
        recordsMap[targetDriverId] = {};
      }

      // Support all 3 key variants for seamless matching:
      // 1. "1405/6/17"
      // 2. "1405/06/17"
      // 3. "1405-06-17"
      const k1 = `${y}/${m}/${d}`;
      const k2 = `${y}/${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}`;
      const k3 = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

      recordsMap[targetDriverId][k1] = status;
      recordsMap[targetDriverId][k2] = status;
      recordsMap[targetDriverId][k3] = status;
    }
  });

  // 5. Decode Staff Members & Staff Attendance
  const staffList: StaffMember[] = [];
  const staffRecordsMap: AttendanceRecords = {};

  (payload.staffDirectory?.employees || []).forEach((emp: any) => {
    const staffId = emp.id;
    staffList.push({
      id: staffId,
      name: emp.name || 'بدون نام',
      code: String(emp.code || ''),
      department: emp.unit || 'اعزام و دیسپچ',
      role: emp.position || 'کارشناس اعزام',
      shift: emp.shift === 'شب‌کار' ? 'night' : 'day',
      status: emp.active ? 'active' : 'inactive',
      entryTime: '۲۰:۰۰',
      exitTime: '۰۶:۰۰',
    });
    staffRecordsMap[staffId] = {};
  });

  // Staff attendance records e.g. "employee-muljnzu0-z0gc0b|1405-07-04": "leave"
  const rawStaffRec = payload.staffAttendance?.records || {};
  Object.keys(rawStaffRec).forEach((key) => {
    const val = rawStaffRec[key];
    const [staffId, dateStr] = key.split('|');
    if (staffId && dateStr) {
      if (!staffRecordsMap[staffId]) staffRecordsMap[staffId] = {};
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const d = parseInt(parts[2], 10);
        const status: AttendanceStatus = val === 'leave' || val === 'م' ? 'leave' : 'workshop';

        const k1 = `${y}/${m}/${d}`;
        const k2 = `${y}/${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}`;
        const k3 = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

        staffRecordsMap[staffId][k1] = status;
        staffRecordsMap[staffId][k2] = status;
        staffRecordsMap[staffId][k3] = status;
      }
    }
  });

  return {
    vehicles: vehiclesList,
    drivers: driversList,
    driverDirectory: driverDirectoryList,
    records: recordsMap,
    staffMembers: staffList,
    staffRecords: staffRecordsMap,
    rules: payload.rules || {},
  };
}

// Pre-decoded dataset immediately ready for application
export const DECODED_BACKUP = decodeBackupData(RAW_BACKUP_PAYLOAD);
