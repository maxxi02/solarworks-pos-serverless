'use client';

import { useState, useEffect } from 'react';
import { Printer, Mail, Upload, Save, Trash2, Eye, X, Settings, Bluetooth, Wifi, Utensils } from 'lucide-react';
import { toast } from 'sonner';
import { useReceiptSettings, DEFAULT_SETTINGS } from '@/hooks/useReceiptSettings';

export default function ReceiptSettings() {
  const { settings: savedSettings, isLoading, saveSettings, updateSetting, updateNestedSetting, updateSectionPosition, testPrint } = useReceiptSettings();
  
  // Local state for form
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'sections' | 'printers'>('general');

  // Load saved settings when available
  useEffect(() => {
    if (savedSettings) {
      setSettings(savedSettings);
    }
  }, [savedSettings]);

  // Handle input changes
  const handleInputChange = (field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle section toggle
  const handleSectionToggle = (section: string, position: 'header' | 'footer' | 'disabled') => {
    setSettings(prev => ({
      ...prev,
      sections: {
        ...prev.sections,
        [section]: {
          header: position === 'header',
          footer: position === 'footer',
          disabled: position === 'disabled'
        }
      }
    }));
  };

  // Handle logo upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast.error('File too large', {
          description: 'Please upload an image smaller than 2MB'
        });
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings(prev => ({
          ...prev,
          logo: reader.result as string,
          logoPreview: reader.result as string
        }));
      };
      reader.readAsDataURL(file);
      
      toast.success('Logo uploaded');
    }
  };

  // Remove logo
  const handleRemoveLogo = () => {
    setSettings(prev => ({
      ...prev,
      logo: null,
      logoPreview: ''
    }));
    toast.info('Logo removed');
  };

  // Save settings
  const handleSave = async () => {
    const success = await saveSettings(settings);
    if (success) {
      toast.success('Settings saved successfully');
    }
  };

  // Reset settings
  const handleReset = () => {
    if (confirm('Are you sure you want to reset all settings to default?')) {
      setSettings(DEFAULT_SETTINGS);
      toast.info('Settings reset to default');
    }
  };

  // Test printer connection
  const handleTestPrinter = async (type: 'customer' | 'kitchen') => {
    await testPrint(type);
  };

  // Receipt Preview Component - VAT REMOVED
// Receipt Preview Component - LARGER FONTS for better readability
const ReceiptPreview = () => {
  const is58mm = settings.receiptWidth === '58mm';
  
  // Calculate preview amounts without VAT
  const subtotal = 428.57;
  const discount = 71.43;
  const total = subtotal - discount; // 357.14 
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 dark:bg-black/90 p-4">
      <div className={`w-full ${is58mm ? 'max-w-[320px]' : 'max-w-[400px]'} rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden`}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-900">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Receipt Preview</h3>
          <button
            onClick={() => setShowPreview(false)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Receipt Preview Content - LARGER FONTS */}
        <div className="p-5 bg-white dark:bg-black">
          <div 
            className={`font-mono ${is58mm ? 'text-sm' : 'text-base'} bg-white dark:bg-black p-5 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg`}
            style={{ lineHeight: '1.6' }}
          >
            {/* Logo */}
            {settings.showLogo && settings.logoPreview && (
              <div className="mb-4 flex justify-center">
                <img src={settings.logoPreview} alt="Logo" className="h-16 object-contain" />
              </div>
            )}
            
            {/* Store Name - LARGER BOLD */}
            {settings.sections.storeName?.header && !settings.sections.storeName?.disabled && (
              <div className="text-center font-black text-xl mb-2">{settings.businessName}</div>
            )}
            
            {/* Location Address - LARGER */}
            {settings.sections.locationAddress?.header && !settings.sections.locationAddress?.disabled && (
              <div className="text-center mb-1 text-sm font-bold">{settings.locationAddress}</div>
            )}
            
            {/* Phone Number - LARGER */}
            {settings.sections.phoneNumber?.header && !settings.sections.phoneNumber?.disabled && (
              <div className="text-center mb-2 text-sm font-bold">{settings.phoneNumber}</div>
            )}
            
            {/* Separator - LARGER */}
            <div className="text-center font-bold text-sm text-gray-500 my-3">{"•".repeat(is58mm ? 32 : 42)}</div>
            
            {/* Order Details - LARGER */}
            <div className="mb-3 text-sm space-y-1.5 font-bold">
              <div className="flex justify-between">
                <span className="font-extrabold">Order #:</span>
                <span>PREVIEW-001</span>
              </div>
              <div className="flex justify-between">
                <span className="font-extrabold">Date:</span>
                <span>{new Date().toLocaleDateString()}, {new Date().toLocaleTimeString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-extrabold">Cashier:</span>
                <span>Test Cashier</span>
              </div>
              <div className="flex justify-between">
                <span className="font-extrabold">Customer:</span>
                <span>Test Customer</span>
              </div>
              {settings.sections.transactionType?.header && !settings.sections.transactionType?.disabled && (
                <div className="flex justify-between">
                  <span className="font-extrabold">Type:</span>
                  <span className="font-bold">DINE-IN</span>
                </div>
              )}
              {settings.sections.orderType?.header && !settings.sections.orderType?.disabled && (
                <div className="flex justify-between">
                  <span className="font-extrabold">Table:</span>
                  <span className="font-bold">5</span>
                </div>
              )}
            </div>
            
            {/* Separator */}
            <div className="text-center font-bold text-sm text-gray-500 my-3">{"•".repeat(is58mm ? 32 : 42)}</div>
            
            {/* Customer Info - LARGER */}
            {settings.sections.customerInfo?.footer && !settings.sections.customerInfo?.disabled && (
              <div className="mb-3 text-sm font-bold">
                <div className="font-extrabold mb-1">Senior/PWD IDs:</div>
                <div className="pl-3">ID-12345, ID-67890</div>
              </div>
            )}
            
            {/* Items Header - LARGER */}
            <div className="mb-2 text-sm">
              <div className="flex justify-between font-extrabold border-b border-dashed border-gray-400 pb-1 mb-2">
                <span>ITEM</span>
                <span>QTY  AMOUNT</span>
              </div>
              
              {/* Regular Item - LARGER */}
              <div className="flex justify-between font-bold mb-1">
                <span>Mocha latte</span>
                <span>2  P428.57</span>
              </div>
              
              {/* Discounted Item - LARGER */}
              <div className="mb-2">
                <div className="flex justify-between font-bold">
                  <span>Cappuccino</span>
                  <span>1  P150.00</span>
                </div>
                <div className="flex justify-between text-green-600 text-xs pl-3 mt-0.5">
                  <span className="font-bold">(20% Senior/PWD)</span>
                  <span className="font-bold">-P30.00</span>
                </div>
              </div>
              
              {/* SKU - if enabled */}
              {settings.showSKU && (
                <div className="text-xs text-gray-500 font-bold mt-1">SKU: PROD-001, PROD-002</div>
              )}
            </div>
            
            {/* Separator */}
            <div className="text-center font-bold text-sm text-gray-500 my-3">{"•".repeat(is58mm ? 32 : 42)}</div>
            
            {/* Totals - LARGER */}
            <div className="mb-3 text-sm space-y-1.5">
              <div className="flex justify-between font-bold">
                <span className="font-extrabold">Subtotal:</span>
                <span>P428.57</span>
              </div>
              <div className="flex justify-between text-green-600 font-bold">
                <span className="font-extrabold">Discount:</span>
                <span>-P71.43</span>
              </div>
              <div className="flex justify-between font-extrabold text-base mt-2 pt-2 border-t-2 border-dashed border-gray-400">
                <span>TOTAL:</span>
                <span className="text-lg">P357.14</span>
              </div>
            </div>
            
            {/* Separator */}
            <div className="text-center font-bold text-sm text-gray-500 my-3">{"•".repeat(is58mm ? 32 : 42)}</div>
            
            {/* Payment - LARGER */}
            <div className="mb-3 text-sm space-y-1.5">
              <div className="flex justify-between font-bold">
                <span className="font-extrabold">Payment:</span>
                <span className="font-extrabold">CASH</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Cash Received:</span>
                <span>P400.00</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Change:</span>
                <span>P42.86</span>
              </div>
            </div>
            
            {/* Barcode - LARGER */}
            {settings.sections.barcode?.header && !settings.sections.barcode?.disabled && (
              <div className="mt-4 text-center font-bold text-sm">
                <div className="font-mono tracking-widest">*PREVIEW-001*</div>
                <div className="font-mono text-base tracking-widest text-gray-700 mt-1">|||| |||| |||| ||||</div>
              </div>
            )}
            
            {/* Business Hours - LARGER */}
            {settings.showBusinessHours && settings.businessHours && (
              <div className="mt-3 text-center font-bold text-xs">
                {settings.businessHours}
              </div>
            )}
            
            {/* Tax PIN - LARGER */}
            {settings.showTaxPIN && settings.taxPin && (
              <div className="mt-2 text-center font-bold text-xs">
                Tax PIN: {settings.taxPin}
              </div>
            )}
            
            {/* Receipt Message - LARGER */}
            {settings.sections.message?.footer && !settings.sections.message?.disabled && settings.receiptMessage && (
              <div className="mt-3 text-center font-bold text-sm italic">
                {settings.receiptMessage}
              </div>
            )}
            
            {/* Disclaimer - LARGER */}
            {!settings.sections.disclaimer?.disabled && settings.disclaimer && (
              <div className="mt-2 text-center font-bold text-xs text-gray-500">
                {settings.disclaimer}
              </div>
            )}
          </div>
          
          {/* Width Indicator */}
          <div className="mt-4 text-center text-base font-medium text-gray-600 dark:text-gray-400">
            Receipt Width: <span className="font-bold text-blue-600">{settings.receiptWidth}</span>
          </div>
          
          {/* Close Button */}
          <div className="mt-5 flex justify-center">
            <button
              onClick={() => setShowPreview(false)}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-base rounded-lg transition-colors shadow-lg"
            >
              Close Preview
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black p-4 md:p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header - CENTERED */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Receipt Settings</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Customize your receipt layout and printer settings
          </p>
          <div className="flex gap-2 justify-center mt-4">
            <button
              onClick={() => setShowPreview(true)}
              className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900"
            >
              <Eye className="h-4 w-4" />
              Preview
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 rounded-lg bg-blue-600 dark:bg-blue-700 px-4 py-2 text-white hover:bg-blue-700 dark:hover:bg-blue-600"
            >
              <Save className="h-4 w-4" />
              Save Settings
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 justify-center mt-6 border-b border-gray-200 dark:border-gray-800">
            <button
              onClick={() => setActiveTab('general')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'general'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-500'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              General Settings
            </button>
            <button
              onClick={() => setActiveTab('sections')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'sections'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-500'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Section Positioning
            </button>
            <button
              onClick={() => setActiveTab('printers')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'printers'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-500'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Printer Settings
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Settings Forms */}
          <div className="lg:col-span-2 space-y-6">
            {/* General Settings Tab */}
            {activeTab === 'general' && (
              <>
                {/* Business Information Card */}
                <div className="rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-gray-800 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Business Information</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Business Name
                      </label>
                      <input
                        type="text"
                        value={settings.businessName}
                        onChange={(e) => handleInputChange('businessName', e.target.value)}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-3 py-2 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Location Address
                      </label>
                      <textarea
                        value={settings.locationAddress}
                        onChange={(e) => handleInputChange('locationAddress', e.target.value)}
                        rows={3}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-3 py-2 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Phone Number
                      </label>
                      <input
                        type="text"
                        value={settings.phoneNumber}
                        onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-3 py-2 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Tax PIN
                      </label>
                      <input
                        type="text"
                        value={settings.taxPin}
                        onChange={(e) => handleInputChange('taxPin', e.target.value)}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-3 py-2 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Display Settings Card - VAT CHECKBOX REMOVED */}
                <div className="rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-gray-800 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Display Settings</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="showLogo"
                          checked={settings.showLogo}
                          onChange={(e) => handleInputChange('showLogo', e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="showLogo" className="text-sm text-gray-700 dark:text-gray-300">
                          Show Logo
                        </label>
                      </div>
                      
                      {/* TAX PIN CHECKBOX - KEPT but only for Tax PIN, not VAT */}
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="showTaxPIN"
                          checked={settings.showTaxPIN}
                          onChange={(e) => handleInputChange('showTaxPIN', e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="showTaxPIN" className="text-sm text-gray-700 dark:text-gray-300">
                          Show Tax PIN
                        </label>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="showSKU"
                          checked={settings.showSKU}
                          onChange={(e) => handleInputChange('showSKU', e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="showSKU" className="text-sm text-gray-700 dark:text-gray-300">
                          Show SKU
                        </label>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="showReferenceNumber"
                          checked={settings.showReferenceNumber}
                          onChange={(e) => handleInputChange('showReferenceNumber', e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="showReferenceNumber" className="text-sm text-gray-700 dark:text-gray-300">
                          Show Reference Number
                        </label>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="showBusinessHours"
                          checked={settings.showBusinessHours}
                          onChange={(e) => handleInputChange('showBusinessHours', e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="showBusinessHours" className="text-sm text-gray-700 dark:text-gray-300">
                          Show Business Hours
                        </label>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Business Hours
                      </label>
                      <textarea
                        value={settings.businessHours}
                        onChange={(e) => handleInputChange('businessHours', e.target.value)}
                        rows={4}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-3 py-2 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none"
                        placeholder="Monday - Sunday: 7:00 AM - 10:00 PM"
                      />
                    </div>
                  </div>
                </div>

                {/* Logo Upload Card */}
                <div className="rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-gray-800 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Logo Settings</h3>
                  
                  <div className="space-y-4">
                    {settings.logoPreview ? (
                      <div className="flex flex-col items-center">
                        <div className="mb-4">
                          <img src={settings.logoPreview} alt="Logo preview" className="h-32 object-contain" />
                        </div>
                        <button
                          onClick={handleRemoveLogo}
                          className="flex items-center gap-2 rounded-lg bg-red-600 dark:bg-red-700 px-4 py-2 text-white hover:bg-red-700 dark:hover:bg-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                          Remove Logo
                        </button>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center">
                        <Upload className="h-12 w-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-600 dark:text-gray-400 mb-2">Upload your cafe logo</p>
                        <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">Recommended: PNG, 300x100px, max 2MB</p>
                        <input
                          type="file"
                          id="logoUpload"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                        <label
                          htmlFor="logoUpload"
                          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 dark:bg-blue-700 px-4 py-2 text-white hover:bg-blue-700 dark:hover:bg-blue-600 cursor-pointer"
                        >
                          <Upload className="h-4 w-4" />
                          Upload Logo
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                {/* Receipt Messages Card */}
                <div className="rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-gray-800 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Receipt Messages</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Receipt Message (Footer)
                      </label>
                      <textarea
                        value={settings.receiptMessage}
                        onChange={(e) => handleInputChange('receiptMessage', e.target.value)}
                        rows={2}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-3 py-2 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none"
                        placeholder="Thank You for visiting!"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Disclaimer
                      </label>
                      <textarea
                        value={settings.disclaimer}
                        onChange={(e) => handleInputChange('disclaimer', e.target.value)}
                        rows={3}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-3 py-2 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none"
                        placeholder="Add any disclaimer text here..."
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Sections Tab */}
            {activeTab === 'sections' && (
              <div className="rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-gray-800 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Section Positioning</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  Choose where each section appears on the receipt (Header, Footer, or Disabled)
                </p>
                
                <div className="space-y-6">
                  {Object.entries(settings.sections).map(([key, value]) => {
                    const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                    return (
                      <div key={key} className="space-y-2 pb-4 border-b border-gray-100 dark:border-gray-800 last:border-0">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          {label}
                        </label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSectionToggle(key, 'header')}
                            className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                              value.header
                                ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/10 dark:text-blue-500'
                                : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-900'
                            }`}
                          >
                            Header
                          </button>
                          <button
                            onClick={() => handleSectionToggle(key, 'footer')}
                            className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                              value.footer
                                ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/10 dark:text-blue-500'
                                : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-900'
                            }`}
                          >
                            Footer
                          </button>
                          <button
                            onClick={() => handleSectionToggle(key, 'disabled')}
                            className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                              value.disabled
                                ? 'border-gray-500 bg-gray-100 text-gray-700 dark:border-gray-500 dark:bg-gray-900/10 dark:text-gray-500'
                                : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-900'
                            }`}
                          >
                            Disabled
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Printers Tab */}
            {activeTab === 'printers' && (
              <>
                {/* Customer Printer Settings */}
                <div className="rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-gray-800 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Printer className="h-5 w-5 text-blue-600" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Customer Printer</h3>
                    </div>
                    <button
                      onClick={() => handleTestPrinter('customer')}
                      className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900"
                    >
                      <Wifi className="h-3 w-3" />
                      Test Connection
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Connection Type
                      </label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateNestedSetting('customerPrinter', 'connectionType', 'usb')}
                          className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                            settings.customerPrinter?.connectionType === 'usb'
                              ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/10 dark:text-blue-500'
                              : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-900'
                          }`}
                        >
                          USB
                        </button>
                        <button
                          onClick={() => updateNestedSetting('customerPrinter', 'connectionType', 'bluetooth')}
                          className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                            settings.customerPrinter?.connectionType === 'bluetooth'
                              ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/10 dark:text-blue-500'
                              : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-900'
                          }`}
                        >
                          Bluetooth
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Paper Width
                      </label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateNestedSetting('customerPrinter', 'paperWidth', '80mm')}
                          className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                            settings.customerPrinter?.paperWidth === '80mm'
                              ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/10 dark:text-blue-500'
                              : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-900'
                          }`}
                        >
                          80mm
                        </button>
                        <button
                          onClick={() => updateNestedSetting('customerPrinter', 'paperWidth', '58mm')}
                          className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                            settings.customerPrinter?.paperWidth === '58mm'
                              ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/10 dark:text-blue-500'
                              : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-900'
                          }`}
                        >
                          58mm
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Kitchen Printer Settings */}
                <div className="rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-gray-800 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Utensils className="h-5 w-5 text-orange-600" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Kitchen Printer</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={settings.kitchenPrinter?.enabled}
                          onChange={(e) => updateNestedSetting('kitchenPrinter', 'enabled', e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span>Enabled</span>
                      </label>
                      <button
                        onClick={() => handleTestPrinter('kitchen')}
                        className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900"
                      >
                        <Bluetooth className="h-3 w-3" />
                        Test Connection
                      </button>
                    </div>
                  </div>
                  
                  {settings.kitchenPrinter?.enabled && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Connection Type
                        </label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateNestedSetting('kitchenPrinter', 'connectionType', 'bluetooth')}
                            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                              settings.kitchenPrinter?.connectionType === 'bluetooth'
                                ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/10 dark:text-blue-500'
                                : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-900'
                            }`}
                          >
                            Bluetooth
                          </button>
                          <button
                            onClick={() => updateNestedSetting('kitchenPrinter', 'connectionType', 'usb')}
                            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                              settings.kitchenPrinter?.connectionType === 'usb'
                                ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/10 dark:text-blue-500'
                                : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-900'
                            }`}
                          >
                            USB
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Printer Name
                        </label>
                        <input
                          type="text"
                          value={settings.kitchenPrinter?.printerName || ''}
                          onChange={(e) => updateNestedSetting('kitchenPrinter', 'printerName', e.target.value)}
                          placeholder="XP-58 Kitchen"
                          className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-3 py-2 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Paper Width
                          </label>
                          <select
                            value={settings.kitchenPrinter?.paperWidth || '58mm'}
                            onChange={(e) => {
                              const value = e.target.value as '58mm' | '80mm';
                              updateNestedSetting('kitchenPrinter', 'paperWidth', value);
                            }}
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-3 py-2 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none"
                          >
                            <option value="58mm">58mm</option>
                            <option value="80mm">80mm</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Copies
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="5"
                            value={settings.kitchenPrinter?.copies || 1}
                            onChange={(e) => updateNestedSetting('kitchenPrinter', 'copies', parseInt(e.target.value))}
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-3 py-2 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id="printOrderNumber"
                            checked={settings.kitchenPrinter?.printOrderNumber}
                            onChange={(e) => updateNestedSetting('kitchenPrinter', 'printOrderNumber', e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <label htmlFor="printOrderNumber" className="text-sm text-gray-700 dark:text-gray-300">
                            Print Order Number
                          </label>
                        </div>

                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id="printTableNumber"
                            checked={settings.kitchenPrinter?.printTableNumber}
                            onChange={(e) => updateNestedSetting('kitchenPrinter', 'printTableNumber', e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <label htmlFor="printTableNumber" className="text-sm text-gray-700 dark:text-gray-300">
                            Print Table Number
                          </label>
                        </div>

                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id="printSpecialInstructions"
                            checked={settings.kitchenPrinter?.printSpecialInstructions}
                            onChange={(e) => updateNestedSetting('kitchenPrinter', 'printSpecialInstructions', e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <label htmlFor="printSpecialInstructions" className="text-sm text-gray-700 dark:text-gray-300">
                            Print Special Instructions
                          </label>
                        </div>

                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id="separateByCategory"
                            checked={settings.kitchenPrinter?.separateByCategory}
                            onChange={(e) => updateNestedSetting('kitchenPrinter', 'separateByCategory', e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <label htmlFor="separateByCategory" className="text-sm text-gray-700 dark:text-gray-300">
                            Separate Items by Category
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Right Column - Actions */}
          <div className="space-y-6">
            {/* Receipt Output Card */}
            <div className="rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-gray-800 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Receipt Output</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Email receipt</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.emailReceipt}
                    onChange={(e) => handleInputChange('emailReceipt', e.target.checked)}
                    className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Printer className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Print receipt</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.printReceipt}
                    onChange={(e) => handleInputChange('printReceipt', e.target.checked)}
                    className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Receipt Width
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleInputChange('receiptWidth', '80mm')}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                      settings.receiptWidth === '80mm'
                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/10 dark:text-blue-500'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-900'
                    }`}
                  >
                    80mm
                  </button>
                  <button
                    onClick={() => handleInputChange('receiptWidth', '58mm')}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                      settings.receiptWidth === '58mm'
                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/10 dark:text-blue-500'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-900'
                    }`}
                  >
                    58mm
                  </button>
                </div>
              </div>
            </div>

            {/* Actions Card */}
            <div className="rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-gray-800 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Actions</h3>
              
              <div className="space-y-3">
                
                <button
                  onClick={handleReset}
                  className="w-full flex items-center justify-center gap-2 rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900"
                >
                  <Settings className="h-4 w-4" />
                  Reset to Default
                </button>
                
                <button
                  onClick={() => setShowPreview(true)}
                  className="w-full flex items-center justify-center gap-2 rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900"
                >
                  <Eye className="h-4 w-4" />
                  Preview Receipt
                </button>
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Changes will affect all receipts printed from your POS system.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Receipt Preview Modal */}
      {showPreview && <ReceiptPreview />}
    </div>
  );
}