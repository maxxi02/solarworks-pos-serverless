'use client';

import React, { useState, useRef } from 'react';

// Web Bluetooth API Type Declarations
declare global {
  interface BluetoothDevice {
    id: string;
    name?: string;
    gatt?: BluetoothRemoteGATTServer;
    addEventListener(type: 'gattserverdisconnected', listener: () => void): void;
    removeEventListener(type: 'gattserverdisconnected', listener: () => void): void;
  }

  interface BluetoothRemoteGATTServer {
    device: BluetoothDevice;
    connected: boolean;
    connect(): Promise<BluetoothRemoteGATTServer>;
    disconnect(): void;
    getPrimaryService(service: string): Promise<BluetoothRemoteGATTService>;
  }

  interface BluetoothRemoteGATTService {
    device: BluetoothDevice;
    uuid: string;
    getCharacteristic(characteristic: string): Promise<BluetoothRemoteGATTCharacteristic>;
  }

  interface BluetoothRemoteGATTCharacteristic {
    service: BluetoothRemoteGATTService;
    uuid: string;
    writeValue(value: BufferSource): Promise<void>;
  }

  interface BluetoothRequestDeviceFilter {
    name?: string;
    namePrefix?: string;
  }

  interface RequestDeviceOptions {
    filters?: BluetoothRequestDeviceFilter[];
    optionalServices?: string[];
  }

  interface Bluetooth {
    requestDevice(options: RequestDeviceOptions): Promise<BluetoothDevice>;
  }

  interface Navigator {
    bluetooth?: Bluetooth;
  }
}

interface PrinterConfig {
  paperWidth: number;
  fontSize: number;
  margin: number;
  chunkSize: number;
  chunkDelay: number;
}

interface ReceiptItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

interface ReceiptData {
  storeName: string;
  address: string;
  phone: string;
  receiptNumber: string;
  date: string;
  items: ReceiptItem[];
  tax: number;
  discount: number;
}

interface BluetoothPrinter {
  device: BluetoothDevice | null;
  characteristic: BluetoothRemoteGATTCharacteristic | null;
  connected: boolean;
}

const PrintPageBluetoothFixed: React.FC = () => {
  const printRef = useRef<HTMLDivElement>(null);
  
  const [printerConfig, setPrinterConfig] = useState<PrinterConfig>({
    paperWidth: 58,
    fontSize: 10,
    margin: 3,
    chunkSize: 20,      // Smaller chunks to prevent disconnect
    chunkDelay: 50,     // Longer delay between chunks
  });

  const [bluetoothPrinter, setBluetoothPrinter] = useState<BluetoothPrinter>({
    device: null,
    characteristic: null,
    connected: false,
  });

  const [connectionStatus, setConnectionStatus] = useState<string>('');
  const [autoReconnect, setAutoReconnect] = useState(false);

  const [receiptData, setReceiptData] = useState<ReceiptData>({
    storeName: 'My Store',
    address: '123 Main Street, City',
    phone: '(555) 123-4567',
    receiptNumber: 'RCP-' + Date.now().toString().slice(-6),
    date: new Date().toLocaleString(),
    items: [
      { id: '1', name: 'Product A', quantity: 2, price: 15.99 },
      { id: '2', name: 'Product B', quantity: 1, price: 29.99 },
    ],
    tax: 0.08,
    discount: 5.00,
  });

  const calculateSubtotal = (): number => {
    return receiptData.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  };

  const calculateTax = (): number => {
    return calculateSubtotal() * receiptData.tax;
  };

  const calculateTotal = (): number => {
    return calculateSubtotal() + calculateTax() - receiptData.discount;
  };

  const onDisconnected = async () => {
    console.log('Printer disconnected');
    setConnectionStatus('⚠️ Printer disconnected');
    
    if (autoReconnect && bluetoothPrinter.device) {
      setConnectionStatus('🔄 Auto-reconnecting...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      try {
        const server = await bluetoothPrinter.device.gatt?.connect();
        if (server) {
          setConnectionStatus('✓ Reconnected successfully');
          // You would need to re-get service and characteristic here
        }
      } catch (error) {
        setConnectionStatus('❌ Reconnection failed');
        setBluetoothPrinter({ device: null, characteristic: null, connected: false });
      }
    } else {
      setBluetoothPrinter({ device: null, characteristic: null, connected: false });
    }
  };

  const connectBluetoothPrinter = async () => {
    try {
      setConnectionStatus('🔍 Searching for printer...');

      if (!navigator.bluetooth) {
        setConnectionStatus('❌ Web Bluetooth not supported. Use Chrome/Edge.');
        return;
      }

      // Request device with multiple name patterns
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { namePrefix: 'XP' },
          { namePrefix: 'BlueTooth' },
          { namePrefix: 'Inner' },
          { namePrefix: 'POS' },
        ],
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb',
          '49535343-fe7d-4ae5-8fa9-9fafd205e455',
          '0000ffe0-0000-1000-8000-00805f9b34fb',
          '0000ff00-0000-1000-8000-00805f9b34fb',
          'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
        ],
      });

      setConnectionStatus('🔗 Connecting to ' + device.name + '...');

      const server = await device.gatt?.connect();
      if (!server) throw new Error('Failed to connect to GATT server');

      setConnectionStatus('📡 Finding printer service...');

      // Try multiple service UUIDs
      let service;
      const serviceUUIDs = [
        '000018f0-0000-1000-8000-00805f9b34fb',
        '49535343-fe7d-4ae5-8fa9-9fafd205e455',
        '0000ffe0-0000-1000-8000-00805f9b34fb',
        '0000ff00-0000-1000-8000-00805f9b34fb',
        'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
      ];

      for (const uuid of serviceUUIDs) {
        try {
          service = await server.getPrimaryService(uuid);
          console.log('✓ Connected with service UUID:', uuid);
          break;
        } catch (e) {
          continue;
        }
      }

      if (!service) throw new Error('No compatible service found');

      setConnectionStatus('🔧 Getting characteristic...');

      // Try multiple characteristic UUIDs
      let characteristic;
      const charUUIDs = [
        '00002af1-0000-1000-8000-00805f9b34fb',
        '49535343-8841-43f4-a8d4-ecbe34729bb3',
        '0000ffe1-0000-1000-8000-00805f9b34fb',
        '0000ff02-0000-1000-8000-00805f9b34fb',
        'e7810a72-73ae-499d-8c15-faa9aef0c3f2',
      ];

      for (const uuid of charUUIDs) {
        try {
          characteristic = await service.getCharacteristic(uuid);
          console.log('✓ Found characteristic UUID:', uuid);
          break;
        } catch (e) {
          continue;
        }
      }

      if (!characteristic) throw new Error('No compatible characteristic found');

      setBluetoothPrinter({ device, characteristic, connected: true });
      setConnectionStatus('✅ Connected to ' + device.name);

      // Handle disconnection
      device.addEventListener('gattserverdisconnected', onDisconnected);

    } catch (error: any) {
      console.error('Bluetooth error:', error);
      setConnectionStatus('❌ Error: ' + error.message);
    }
  };

  const disconnectBluetoothPrinter = () => {
    if (bluetoothPrinter.device?.gatt?.connected) {
      bluetoothPrinter.device.gatt.disconnect();
    }
    setBluetoothPrinter({ device: null, characteristic: null, connected: false });
    setConnectionStatus('Disconnected');
  };

  const testConnection = async () => {
    if (!bluetoothPrinter.connected || !bluetoothPrinter.characteristic) {
      setConnectionStatus('❌ Not connected');
      return;
    }

    setConnectionStatus('🧪 Testing connection...');
    
    try {
      const testCmd = new Uint8Array([0x1B, 0x40]); // ESC @ (initialize)
      await bluetoothPrinter.characteristic.writeValue(testCmd);
      setConnectionStatus('✅ Connection test passed!');
    } catch (error: any) {
      setConnectionStatus('❌ Test failed: ' + error.message);
    }
  };

  const ESC = 0x1b;
  const GS = 0x1d;

  const generateESCPOSCommands = (): Uint8Array => {
    const encoder = new TextEncoder();
    const commands: number[] = [];

    // Initialize
    commands.push(ESC, 0x40);
    commands.push(ESC, 0x74, 0);

    // Center align + Bold
    commands.push(ESC, 0x61, 1);
    commands.push(ESC, 0x21, 0x30);
    commands.push(...encoder.encode(receiptData.storeName + '\n'));
    
    // Normal text
    commands.push(ESC, 0x21, 0x00);
    commands.push(...encoder.encode(receiptData.address + '\n'));
    commands.push(...encoder.encode('Tel: ' + receiptData.phone + '\n'));
    commands.push(...encoder.encode('------------------------\n'));

    // Left align
    commands.push(ESC, 0x61, 0);
    commands.push(...encoder.encode('Receipt: ' + receiptData.receiptNumber + '\n'));
    commands.push(...encoder.encode('Date: ' + receiptData.date + '\n'));
    commands.push(...encoder.encode('------------------------\n'));

    // Items
    receiptData.items.forEach((item) => {
      commands.push(...encoder.encode(item.name + '\n'));
      commands.push(...encoder.encode(`  ${item.quantity} x $${item.price.toFixed(2)} = $${(item.quantity * item.price).toFixed(2)}\n`));
    });

    commands.push(...encoder.encode('------------------------\n'));

    // Totals
    commands.push(...encoder.encode(`Subtotal: $${calculateSubtotal().toFixed(2)}\n`));
    commands.push(...encoder.encode(`Tax: $${calculateTax().toFixed(2)}\n`));
    if (receiptData.discount > 0) {
      commands.push(...encoder.encode(`Discount: -$${receiptData.discount.toFixed(2)}\n`));
    }

    commands.push(ESC, 0x21, 0x30);
    commands.push(...encoder.encode(`TOTAL: $${calculateTotal().toFixed(2)}\n`));
    commands.push(ESC, 0x21, 0x00);

    // Footer
    commands.push(ESC, 0x61, 1);
    commands.push(...encoder.encode('\nThank you!\n'));
    commands.push(...encoder.encode('\n\n\n'));
    commands.push(GS, 0x56, 0x00);

    return new Uint8Array(commands);
  };

  const printToBluetoothPrinter = async () => {
    if (!bluetoothPrinter.connected || !bluetoothPrinter.characteristic) {
      setConnectionStatus('❌ Printer not connected');
      return;
    }

    try {
      setConnectionStatus('🖨️ Printing...');
      const commands = generateESCPOSCommands();
      
      let successChunks = 0;
      const totalChunks = Math.ceil(commands.length / printerConfig.chunkSize);

      for (let i = 0; i < commands.length; i += printerConfig.chunkSize) {
        const chunk = commands.slice(i, i + printerConfig.chunkSize);
        
        try {
          await bluetoothPrinter.characteristic.writeValue(chunk);
          successChunks++;
          setConnectionStatus(`🖨️ Printing... ${successChunks}/${totalChunks}`);
          await new Promise(resolve => setTimeout(resolve, printerConfig.chunkDelay));
        } catch (writeError) {
          console.error('Write error at chunk', successChunks, writeError);
          throw writeError;
        }
      }

      setConnectionStatus('✅ Print completed!');
    } catch (error: any) {
      console.error('Print error:', error);
      setConnectionStatus('❌ Print failed: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold mb-6 text-gray-800">
          XPrinter Bluetooth (Fixed)
        </h1>

        {/* Troubleshooting Tips */}
        <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <h3 className="font-semibold text-yellow-900 mb-2">⚠️ If Disconnecting:</h3>
          <ul className="text-sm text-yellow-800 space-y-1">
            <li>1. <strong>Unpair</strong> from Windows Bluetooth settings first</li>
            <li>2. Move printer <strong>closer</strong> to computer</li>
            <li>3. Disable Windows <strong>Bluetooth power saving</strong></li>
            <li>4. Use <strong>Chrome</strong> or <strong>Edge</strong> browser</li>
            <li>5. Consider using <strong>USB cable</strong> instead (more reliable)</li>
          </ul>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Bluetooth Connection</h2>
          
          <div className="space-y-4">
            {!bluetoothPrinter.connected ? (
              <button
                onClick={connectBluetoothPrinter}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
              >
                🔵 Connect to Printer
              </button>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={disconnectBluetoothPrinter}
                  className="w-full px-4 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium"
                >
                  🔴 Disconnect
                </button>
                <button
                  onClick={testConnection}
                  className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  🧪 Test Connection
                </button>
                <button
                  onClick={printToBluetoothPrinter}
                  className="w-full px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
                >
                  🖨️ Print Receipt
                </button>
              </div>
            )}

            {connectionStatus && (
              <div className={`text-sm p-3 rounded ${
                connectionStatus.includes('❌') ? 'bg-red-100 text-red-700' :
                connectionStatus.includes('✅') ? 'bg-green-100 text-green-700' :
                connectionStatus.includes('⚠️') ? 'bg-yellow-100 text-yellow-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {connectionStatus}
              </div>
            )}

            <label className="flex items-center text-sm">
              <input
                type="checkbox"
                checked={autoReconnect}
                onChange={(e) => setAutoReconnect(e.target.checked)}
                className="mr-2"
              />
              Auto-reconnect on disconnect
            </label>

            <div className="pt-4 border-t">
              <h3 className="text-sm font-medium mb-3">Advanced Settings</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Chunk Size</label>
                  <input
                    type="number"
                    value={printerConfig.chunkSize}
                    onChange={(e) => setPrinterConfig({...printerConfig, chunkSize: Number(e.target.value)})}
                    className="w-full px-2 py-1 border rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Delay (ms)</label>
                  <input
                    type="number"
                    value={printerConfig.chunkDelay}
                    onChange={(e) => setPrinterConfig({...printerConfig, chunkDelay: Number(e.target.value)})}
                    className="w-full px-2 py-1 border rounded text-sm"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Lower chunk size (20) and higher delay (50ms) = more stable but slower
              </p>
            </div>
          </div>
        </div>

        {/* Receipt Preview */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Receipt Preview</h2>
          <div className="border-2 border-gray-300 rounded p-4 bg-white">
            <div ref={printRef} style={{ fontFamily: "'Courier New', monospace", fontSize: '10px', width: '55mm' }}>
              <div style={{ textAlign: 'center', borderBottom: '2px dashed #000', paddingBottom: '8px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{receiptData.storeName}</div>
                <div style={{ fontSize: '9px' }}>{receiptData.address}</div>
                <div style={{ fontSize: '9px' }}>Tel: {receiptData.phone}</div>
              </div>
              <div style={{ margin: '8px 0', fontSize: '9px' }}>
                <div>Receipt: {receiptData.receiptNumber}</div>
                <div>Date: {receiptData.date}</div>
              </div>
              <div style={{ borderTop: '1px dashed #000', paddingTop: '8px' }}>
                {receiptData.items.map(item => (
                  <div key={item.id} style={{ marginBottom: '4px' }}>
                    <div>{item.name}</div>
                    <div style={{ fontSize: '9px' }}>
                      {item.quantity} x ${item.price.toFixed(2)} = ${(item.quantity * item.price).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: '1px dashed #000', paddingTop: '8px', marginTop: '8px' }}>
                <div>Subtotal: ${calculateSubtotal().toFixed(2)}</div>
                <div>Tax: ${calculateTax().toFixed(2)}</div>
                <div>Discount: -${receiptData.discount.toFixed(2)}</div>
                <div style={{ fontWeight: 'bold', fontSize: '12px', marginTop: '4px' }}>
                  TOTAL: ${calculateTotal().toFixed(2)}
                </div>
              </div>
              <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '9px' }}>
                <div>Thank you!</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintPageBluetoothFixed;