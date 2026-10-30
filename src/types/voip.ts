export type VoipMode = 'softphone' | 'asterisk_ami' | 'webhook' | 'ipphone_cti';

export interface VoipConfig {
  enabled: boolean;
  mode: VoipMode;
  
  // 1. Softphone OS Protocol Mode
  softphoneProtocol: 'tel' | 'sip'; // tel:0912... or sip:0912...
  
  // 2. Asterisk / Issabel / FreePBX AMI Settings
  amiHost: string;              // e.g., '192.168.1.200'
  amiPort: number;              // default 5038
  amiUser: string;              // e.g., 'admin' or 'hamibar'
  amiSecret: string;            // password
  amiContext: string;           // default 'from-internal'
  channelType: 'PJSIP' | 'SIP' | 'Local'; // default 'SIP'
  autoAnswer: boolean;          // sends Alert-Info / Intercom header for auto speaker pickup
  
  // 3. User Station & Dialing Settings
  operatorExtension: string;    // e.g., '101' (current workstation desk phone extension)
  dialPrefix: string;           // e.g., '9' or '0' for outside trunk line (optional)
  callerId: string;             // e.g., 'HamiBar <101>'
  
  // 4. Custom Webhook Mode (Issabel call generator, PHP script, REST PBX)
  webhookUrl: string;           // e.g., 'http://192.168.1.200:8080/call?ext={from}&num={to}'
  webhookMethod: 'GET' | 'POST';
  
  // 5. Hardware IP Phone CTI Direct Dial (Yealink / Grandstream / Fanvil)
  ipPhoneModel: 'yealink' | 'grandstream' | 'fanvil';
  ipPhoneIp: string;            // e.g., '192.168.1.45'
  ipPhoneUser: string;          // default 'admin'
  ipPhonePass: string;          // default 'admin'
}

export interface VoipCallLog {
  id: string;
  timestamp: string;
  recipientName: string;
  phoneNumber: string;
  operatorExtension: string;
  mode: VoipMode;
  status: 'initiated' | 'ringing' | 'connected' | 'failed';
  message?: string;
  durationSeconds?: number;
}

export const DEFAULT_VOIP_CONFIG: VoipConfig = {
  enabled: true,
  mode: 'asterisk_ami', // Option 1: Asterisk / Issabel / FreePBX AMI Call Originate
  softphoneProtocol: 'tel',
  amiHost: '192.168.1.200',
  amiPort: 5038,
  amiUser: 'admin',
  amiSecret: '',
  amiContext: 'from-internal',
  channelType: 'SIP',
  autoAnswer: true,
  operatorExtension: '101',
  dialPrefix: '',
  callerId: 'حامی بار',
  webhookUrl: 'http://192.168.1.200/call.php?ext={from}&num={to}',
  webhookMethod: 'GET',
  ipPhoneModel: 'yealink',
  ipPhoneIp: '192.168.1.45',
  ipPhoneUser: 'admin',
  ipPhonePass: 'admin',
};
