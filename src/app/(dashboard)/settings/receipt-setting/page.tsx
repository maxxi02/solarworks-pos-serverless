'use client';

import { useState } from 'react';
import { Printer, Mail, Upload, Save, Trash2, Eye, Check, X, Settings } from 'lucide-react';
import { toast } from 'sonner';

export default function ReceiptSettings() {
  // State for receipt settings
  const [settings, setSettings] = useState({
    businessName: 'Rendezvous Cafe',
    locationAddress: 'Rendezvous Café, Talisay - Tanauan Road, Natatas, Tanauan City, Batangas, Philippines',
    phoneNumber: '+63639660049893',
    taxPin: '123-456-789-000',
    
    // Display options
    showLogo: true,
    showTaxPIN: true,
    showSKU: false,
    showReferenceNumber: true,
    showBusinessHours: true,
    
    // Email settings
    emailReceipt: true,
    printReceipt: true,
    
    // Receipt width
    receiptWidth: '80mm',
    
    // Header/Footer settings (for each section)
    sections: {
      locationAddress: { header: true, footer: false, disabled: false },
      storeName: { header: true, footer: false, disabled: false },
      transactionType: { header: true, footer: false, disabled: false },
      phoneNumber: { header: false, footer: false, disabled: false },
      message: { header: false, footer: true, disabled: false },
      payLaterDueDate: { header: false, footer: false, disabled: true },
      orderType: { header: false, footer: false, disabled: true },
      disclaimer: { header: false, footer: false, disabled: true },
      barcode: { header: true, footer: false, disabled: false },
      orderNote: { header: false, footer: true, disabled: false },
      customerInfo: { header: false, footer: true, disabled: false },
    },
    
    // Messages
    receiptMessage: 'Thank You for visiting Rendezvous Cafe!',
    disclaimer: 'Prices include 12% VAT. No refunds or exchanges on food items.',
    
    // Business hours
    businessHours: 'Monday - Sunday: 7:00 AM - 10:00 PM',
    
    // Logo
    logo: null as File | null,
    logoPreview: '',
  });

  // Preview mode state
  const [showPreview, setShowPreview] = useState(false);

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
          logo: file,
          logoPreview: reader.result as string
        }));
      };
      reader.readAsDataURL(file);
      
      toast.success('Logo uploaded', {
        description: 'Logo has been uploaded successfully'
      });
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
  const handleSave = () => {
    // Here you would typically save to your backend
    toast.success('Settings saved', {
      description: 'Receipt settings have been updated'
    });
  };

  // Reset settings
  const handleReset = () => {
    if (confirm('Are you sure you want to reset all settings to default?')) {
      setSettings({
        businessName: 'Rendezvous Cafe',
        locationAddress: 'Rendezvous Café, Talisay - Tanauan Road, Natatas, Tanauan City, Batangas, Philippines',
        phoneNumber: '+63639660049893',
        taxPin: '123-456-789-000',
        showLogo: true,
        showTaxPIN: true,
        showSKU: false,
        showReferenceNumber: true,
        showBusinessHours: true,
        emailReceipt: true,
        printReceipt: true,
        receiptWidth: '80mm',
        sections: {
          
          locationAddress: { header: true, footer: false, disabled: false },
          storeName: { header: true, footer: false, disabled: false },
          transactionType: { header: true, footer: false, disabled: false },
          phoneNumber: { header: false, footer: false, disabled: false },
          message: { header: false, footer: true, disabled: false },
          payLaterDueDate: { header: false, footer: false, disabled: true },
          orderType: { header: false, footer: false, disabled: true },
          disclaimer: { header: false, footer: false, disabled: true },
          barcode: { header: true, footer: false, disabled: false },
          orderNote: { header: false, footer: true, disabled: false },
          customerInfo: { header: false, footer: true, disabled: false },
        },
        receiptMessage: 'Thank You for visiting Rendezvous Cafe!',
        disclaimer: 'Prices include 12% VAT. No refunds or exchanges on food items.',
        businessHours: 'Monday - Sunday: 7:00 AM - 10:00 PM',
        logo: null,
        logoPreview: '',
      });
      toast.info('Settings reset to default');
    }
  };

  // Receipt Preview Component
  const ReceiptPreview = () => {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 dark:bg-black/90">
        <div className="w-full max-w-md rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-gray-800 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Receipt Preview</h3>
            <button
              onClick={() => setShowPreview(false)}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          {/* Receipt Preview Content */}
          <div className="font-mono text-xs bg-white dark:bg-black p-4 border border-dashed border-gray-300 dark:border-gray-700">
            {/* Logo */}
            {settings.showLogo && settings.logoPreview && (
              <div className="mb-2 flex justify-center">
                <img src={settings.logoPreview} alt="Logo" className="h-16 object-contain" />
              </div>
            )}
            
            {/* Store Name */}
            {settings.sections.storeName.header && (
              <div className="text-center font-bold mb-1">{settings.businessName}</div>
            )}
            
            {/* Location Address */}
            {settings.sections.locationAddress.header && (
              <div className="text-center mb-1">{settings.locationAddress}</div>
            )}
            
            {/* Phone Number */}
            {settings.sections.phoneNumber.header && !settings.sections.phoneNumber.disabled && (
              <div className="text-center mb-1">{settings.phoneNumber}</div>
            )}
            
            {/* Separator */}
            <div className="text-center mb-1">--------------------------------</div>
            
            {/* Order Details */}
            <div className="mb-1">
              <div>Date: {new Date().toLocaleDateString()}, {new Date().toLocaleTimeString()}</div>
              <div>Order Type: DINE_IN</div>
              <div>Transaction #: {settings.showReferenceNumber ? '1637000006' : ''}</div>
              <div>Cashier: [Owner]</div>
            </div>
            
            <div className="text-center mb-1">--------------------------------</div>
            
            {/* Customer Info */}
            {settings.sections.customerInfo.footer && !settings.sections.customerInfo.disabled && (
              <div className="mb-1">
                <div>Customer: Valor customer</div>
                <div>Phone: </div>
                <div>Rewarded Points: </div>
                <div>Total Points: </div>
              </div>
            )}
            
            {/* Items */}
            <div className="mb-1">
              <div>Item(s)</div>
              <div>1. Mocha latte - 5x @178.57 P892.85</div>
            </div>
            
            <div className="text-center mb-1">--------------------------------</div>
            
            {/* Totals */}
            <div className="mb-1">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>P892.85</span>
              </div>
              <div className="flex justify-between">
                <span>Tax:</span>
                <span>P107.15</span>
              </div>
              {settings.showTaxPIN && (
                <div className="flex justify-between text-xs">
                  <span>VAT 12% (Included):</span>
                  <span>P107.15</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Discount:</span>
                <span>P307.15</span>
              </div>
              <div className="flex justify-between font-bold mt-1">
                <span>TOTAL:</span>
                <span>P692.85</span>
              </div>
            </div>
            
            <div className="text-center mb-1">--------------------------------</div>
            
            {/* Payment */}
            <div className="mb-1">
              <div className="flex justify-between">
                <span>Cash Received:</span>
                <span>P700.00</span>
              </div>
              <div className="flex justify-between">
                <span>Change:</span>
                <span>P7.15</span>
              </div>
            </div>
            
            {/* Barcode */}
            {settings.sections.barcode.header && !settings.sections.barcode.disabled && (
              <div className="mt-2 text-center">
                <div>[BARCODE: 1637000006]</div>
              </div>
            )}
            
            {/* Business Hours */}
            {settings.showBusinessHours && (
              <div className="mt-2 text-center text-xs">
                <div>{settings.businessHours}</div>
              </div>
            )}
            
            {/* Tax PIN */}
            {settings.showTaxPIN && (
              <div className="mt-1 text-center text-xs">
                <div>Tax PIN: {settings.taxPin}</div>
              </div>
            )}
            
            {/* Receipt Message */}
            {settings.sections.message.footer && !settings.sections.message.disabled && (
              <div className="mt-2 text-center">
                <div>{settings.receiptMessage}</div>
              </div>
            )}
            
            {/* Disclaimer */}
            {!settings.sections.disclaimer.disabled && (
              <div className="mt-1 text-center text-xs">
                <div>{settings.disclaimer}</div>
              </div>
            )}
          </div>
          
          <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
            Receipt Width: {settings.receiptWidth} ({(settings.receiptWidth === '80mm' ? '3.14 inches' : '2.36 inches')})
          </div>
          
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => setShowPreview(false)}
              className="rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900"
            >
              Close Preview
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Receipt Settings</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Customize your receipt layout and information for Rendezvous Cafe
              </p>
            </div>
            <div className="flex gap-2 mt-4 sm:mt-0">
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
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Business Information */}
          <div className="lg:col-span-2 space-y-6">
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

            {/* Display Settings Card */}
            <div className="rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-gray-800 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Display Settings</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left side - Checkboxes */}
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
                
                {/* Right side - Business Hours */}
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
          </div>

          {/* Right Column - Layout and Actions */}
          <div className="space-y-6">
            {/* Section Positioning Card */}
            <div className="rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-gray-800 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Section Positioning</h3>
              
              <div className="space-y-4">
                {Object.entries(settings.sections).map(([key, value]) => {
                  const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                  return (
                    <div key={key} className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {label}
                      </label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSectionToggle(key, 'header')}
                          className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium ${
                            value.header
                              ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/10 dark:text-blue-500'
                              : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-900'
                          }`}
                        >
                          Header
                        </button>
                        <button
                          onClick={() => handleSectionToggle(key, 'footer')}
                          className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium ${
                            value.footer
                              ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/10 dark:text-blue-500'
                              : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-900'
                          }`}
                        >
                          Footer
                        </button>
                        <button
                          onClick={() => handleSectionToggle(key, 'disabled')}
                          className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium ${
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
                    80mm (3.14")
                  </button>
                  <button
                    onClick={() => handleInputChange('receiptWidth', '58mm')}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                      settings.receiptWidth === '58mm'
                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/10 dark:text-blue-500'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-900'
                    }`}
                  >
                    58mm (2.28")
                  </button>
                </div>
              </div>
            </div>

            {/* Actions Card */}
            <div className="rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-gray-800 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Actions</h3>
              
              <div className="space-y-3">
                <button
                  onClick={handleSave}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 dark:bg-blue-700 px-4 py-3 text-white hover:bg-blue-700 dark:hover:bg-blue-600"
                >
                  <Save className="h-4 w-4" />
                  Save Settings
                </button>
                
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
                  Changes will affect all receipts printed or emailed from your POS system.
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