'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Bot,
  X,
  Sparkles,
  Package,
  Calendar,
  Loader2,
  Zap,
  BarChart3,
  Maximize2,
  Minimize2,
  LayoutGrid,
  List,
  AlignLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/format-utils';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { authClient } from '@/lib/auth-client';
import { useTheme } from 'next-themes';
import { useNotificationSound } from '@/lib/use-notification-sound';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  viewFormat: 'paragraph' | 'bullet' | 'table';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
}

interface AnalyticsData {
  type: string;
  generatedAt: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

type ViewFormat = 'paragraph' | 'bullet' | 'table';

const quickActions = [
  { id: 'today-highlights', label: "Today's Highlights", icon: Zap, description: 'Revenue, top products, recent activity' },
  { id: 'monthly-trends', label: 'Monthly Trends', icon: Calendar, description: 'This month vs last month performance' },
  { id: 'all-time-stats', label: 'All-Time Stats', icon: BarChart3, description: 'Best sellers, total revenue, customers' },
  { id: 'inventory-insights', label: 'Inventory Alerts', icon: Package, description: 'Low stock, critical items, restock needs' },
  { id: 'full-summary', label: 'Full Summary', icon: Sparkles, description: 'Complete dashboard overview' },
];

const getGreeting = (name: string): string => {
  const hour = new Date().getHours();
  let greeting = '';
  if (hour < 12) greeting = 'Magandang Umaga';
  else if (hour < 18) greeting = 'Magandang Hapon';
  else greeting = 'Magandang Gabi';
  return `${greeting}, ${name}!`;
};

const stripMarkdown = (text: string): string => {
  return text
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/##/g, '')
    .replace(/#/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`/g, '')
    .trim();
};

export function AICompanion() {
  const { theme } = useTheme();
  const { data: session } = authClient.useSession();
  const userName = session?.user?.name || session?.user?.email?.split('@')[0] || 'Admin';
  const { playOrder, playSuccess } = useNotificationSound();

  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [greeted, setGreeted] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && !greeted) {
      const greetingMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: getGreeting(userName),
        timestamp: new Date(),
        viewFormat: 'paragraph'
      };
      setMessages([greetingMessage]);
      setGreeted(true);
      playOrder(); // Play sound on greeting
    }
    if (!isOpen) {
      setGreeted(false);
    }
  }, [isOpen, userName, playOrder]);

  const changeViewFormat = (messageId: string, format: ViewFormat) => {
    setMessages(prev => prev.map(m =>
      m.id === messageId ? { ...m, viewFormat: format } : m
    ));
  };

  const formatContent = (content: string, format: ViewFormat): string => {
    const lines = content.split('\n').filter(l => l.trim());

    if (format === 'paragraph') {
      return content.replace(/\n/g, ' ');
    }

    if (format === 'bullet') {
      return lines.map(line => {
        const clean = line.replace(/^[0-9]+\.\s*/, '').replace(/^[•\-*]\s*/, '');
        return `• ${clean}`;
      }).join('\n');
    }

    return content;
  };

  const renderFormattedContent = (message: Message) => {
    const formatted = formatContent(message.content, message.viewFormat);
    return <div className="text-sm whitespace-pre-wrap">{formatted}</div>;
  };

  const fetchAnalytics = async (type: string) => {
    setIsLoading(true);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: quickActions.find(a => a.id === type)?.label || type,
      timestamp: new Date(),
      viewFormat: 'paragraph'
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const res = await fetch(`/api/ai-companion?type=${type}`);
      const json = await res.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: stripMarkdown(generateResponse(type, json.data)),
        timestamp: new Date(),
        viewFormat: 'bullet',
        data: json.data
      };
      setMessages(prev => [...prev, assistantMessage]);
      playSuccess(); // Play success sound when data is loaded
    } catch {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error fetching the analytics. Please try again.',
        timestamp: new Date(),
        viewFormat: 'paragraph'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateResponse = (type: string, data: AnalyticsData): string => {
    switch (type) {
      case 'today-highlights':
        return `Today's Performance\n` +
          `Revenue: ${formatCurrency(data.todayRevenue)} (${data.revenueChange}% vs yesterday)\n` +
          `Transactions: ${data.todayTransactions}\n\n` +
          `Top Products Today:\n` +
          data.topProductsToday?.map((p: unknown, i: number) => `${i + 1}. ${(p as { name: string }).name} - ${(p as { quantity: number }).quantity} sold`).join('\n') || 'No sales today';

      case 'monthly-trends':
        return `Monthly Trends (Last 30 Days)\n` +
          `Revenue: ${formatCurrency(data.monthRevenue)} (${data.monthChange}% vs last month)\n` +
          `Transactions: ${data.monthTransactions}\n\n` +
          `Top Products This Month:\n` +
          data.topProductsMonth?.map((p: unknown, i: number) => `${i + 1}. ${(p as { name: string }).name} - ${(p as { quantity: number }).quantity} sold (${formatCurrency((p as { revenue: number }).revenue)})`).join('\n') || 'No data';

      case 'all-time-stats':
        return `All-Time Statistics\n` +
          `Total Revenue: ${formatCurrency(data.totalRevenue)}\n` +
          `Total Transactions: ${data.totalTransactions}\n` +
          `Products: ${data.totalProducts}\n` +
          `Customers: ${data.totalCustomers}\n` +
          `Staff: ${data.totalStaff}\n\n` +
          `All-Time Best Sellers:\n` +
          data.topProductsAllTime?.map((p: unknown, i: number) => `${i + 1}. ${(p as { name: string }).name} - ${(p as { quantity: number }).quantity} sold`).join('\n') || 'No data';

      case 'inventory-insights':
        return `Inventory Insights\n` +
          `Total Products: ${data.totalProducts}\n` +
          `Inventory Value: ${formatCurrency(data.totalInventoryValue)}\n` +
          `Items Needing Restock: ${data.itemsNeedingRestock}\n\n` +
          `Critical Stock:\n` +
          data.criticalStockItems?.map((p: unknown) => `${(p as { name: string }).name}: ${(p as { currentStock: number }).currentStock} left`).join('\n') || 'None\n\n' +
          `Low Stock:\n` +
          data.lowStockItems?.map((p: unknown) => `${(p as { name: string }).name}: ${(p as { currentStock: number }).currentStock} (min: ${(p as { reorderPoint: number }).reorderPoint})`).join('\n') || 'None';

      case 'full-summary':
        return `Complete Dashboard Summary\n` +
          `Today: ${formatCurrency(data.today?.todayRevenue)} revenue, ${data.today?.todayTransactions} transactions\n` +
          `This Month: ${formatCurrency(data.month?.monthRevenue)} revenue, ${data.month?.monthTransactions} transactions\n` +
          `All Time: ${formatCurrency(data.allTime?.totalRevenue)} total revenue\n` +
          `Inventory: ${data.inventory?.itemsNeedingRestock} items need restock\n\n` +
          `Your business is ${parseFloat(data.today?.revenueChange || '0') > 0 ? 'growing' : 'down'} compared to yesterday!`;

      default:
        return 'Here are your analytics.';
    }
  };

  const renderDataCard = (data: AnalyticsData) => {
    if (!data) return null;

    switch (data.type) {
      case 'today-highlights':
        return (
          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-2">
              <div className={cn("p-3 rounded-lg", theme === 'dark' ? "bg-green-900/30" : "bg-green-50")}>
                <p className="text-xs text-muted-foreground">Revenue</p>
                <p className="font-bold text-green-600 dark:text-green-400">{formatCurrency(data.todayRevenue)}</p>
              </div>
              <div className={cn("p-3 rounded-lg", theme === 'dark' ? "bg-blue-900/30" : "bg-blue-50")}>
                <p className="text-xs text-muted-foreground">Transactions</p>
                <p className="font-bold text-blue-600 dark:text-blue-400">{data.todayTransactions}</p>
              </div>
            </div>
            {data.topProductsToday?.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-1">Top Products</p>
                <div className="space-y-1">
                  {data.topProductsToday.slice(0, 3).map((p: unknown, i: number) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span>{(p as { name: string }).name}</span>
                      <Badge variant="outline">{(p as { quantity: number }).quantity}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'monthly-trends':
        return (
          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-2">
              <div className={cn("p-3 rounded-lg", theme === 'dark' ? "bg-green-900/30" : "bg-green-50")}>
                <p className="text-xs text-muted-foreground">Month Revenue</p>
                <p className="font-bold text-green-600 dark:text-green-400">{formatCurrency(data.monthRevenue)}</p>
              </div>
              <div className={cn("p-3 rounded-lg", theme === 'dark' ? "bg-purple-900/30" : "bg-purple-50")}>
                <p className="text-xs text-muted-foreground">vs Last Month</p>
                <p className={`font-bold ${parseFloat(data.monthChange) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {data.monthChange}%
                </p>
              </div>
            </div>
          </div>
        );

      case 'inventory-insights':
        return (
          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-2">
              <div className={cn("p-3 rounded-lg", theme === 'dark' ? "bg-amber-900/30" : "bg-amber-50")}>
                <p className="text-xs text-muted-foreground">Need Restock</p>
                <p className="font-bold text-amber-600 dark:text-amber-400">{data.itemsNeedingRestock}</p>
              </div>
              <div className={cn("p-3 rounded-lg", theme === 'dark' ? "bg-gray-800" : "bg-gray-50")}>
                <p className="text-xs text-muted-foreground">Total Value</p>
                <p className="font-bold">{formatCurrency(data.totalInventoryValue)}</p>
              </div>
            </div>
            {data.criticalStockItems?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-red-500 mb-1">Critical Stock</p>
                <div className="space-y-1">
                  {data.criticalStockItems.slice(0, 3).map((p: unknown, i: number) => (
                    <div key={i} className="flex justify-between text-xs text-red-500">
                      <span>{(p as { name: string }).name}</span>
                      <span>{(p as { currentStock: number }).currentStock} left</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const isGreetingOnly = (content: string): boolean => {
    return content.startsWith('Magandang');
  };

  return (
    <>
      {/* Floating Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 bg-primary hover:bg-primary/90"
        size="icon"
      >
        <Bot className="h-6 w-6 text-primary-foreground" />
      </Button>

      {/* Panel */}
      <div
        className={cn(
          "fixed bg-background border shadow-2xl z-50 transition-all duration-300 flex flex-col",
          isFullscreen
            ? "inset-0 rounded-none"
            : "bottom-6 right-6 w-96 h-[500px] rounded-2xl",
          isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        )}
        data-lenis-prevent
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-primary text-primary-foreground">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            <div className="flex flex-col">
              <span className="font-semibold text-sm leading-tight">Rendy</span>
              <span className="text-[10px] opacity-80">Your daily AI companion</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="text-primary-foreground hover:bg-white/20 h-8 w-8"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => { setIsOpen(false); setIsFullscreen(false); setMessages([]); }}
              className="text-primary-foreground hover:bg-white/20 h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {messages.length === 0 || (messages.length === 1 && isGreetingOnly(messages[0]?.content)) ? (
            <div className="flex-1 p-4 overflow-y-auto min-h-0" data-lenis-prevent>
              {messages.length === 1 && isGreetingOnly(messages[0]?.content) && (
                <div className="mb-4 p-3 bg-muted rounded-lg">
                  <p className="text-sm">{messages[0].content}</p>
                </div>
              )}
              <div className="text-center mb-4">
                <Sparkles className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-sm text-muted-foreground">What would you like to know?</p>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {quickActions.map((action) => (
                  <Button
                    key={action.id}
                    variant="outline"
                    className="justify-start h-auto py-3 px-3 text-left hover:bg-accent"
                    onClick={() => fetchAnalytics(action.id)}
                    disabled={isLoading}
                  >
                    <action.icon className="h-4 w-4 mr-2 text-primary shrink-0" />
                    <div>
                      <div className="font-medium text-sm">{action.label}</div>
                      <div className="text-xs text-muted-foreground">{action.description}</div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-4 min-h-0" data-lenis-prevent>
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex",
                        message.role === 'user' ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[90%] rounded-lg px-3 py-2",
                          message.role === 'user'
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        )}
                      >
                        {message.role === 'assistant' && !isGreetingOnly(message.content) && (
                          <div className="flex justify-end mb-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                                  {message.viewFormat === 'paragraph' && <AlignLeft className="h-3 w-3 mr-1" />}
                                  {message.viewFormat === 'bullet' && <List className="h-3 w-3 mr-1" />}
                                  {message.viewFormat === 'table' && <LayoutGrid className="h-3 w-3 mr-1" />}
                                  {message.viewFormat === 'paragraph' ? 'Paragraph' : message.viewFormat === 'bullet' ? 'Bullet' : 'Table'}
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => changeViewFormat(message.id, 'paragraph')}>
                                  <AlignLeft className="mr-2 h-3 w-3" /> Paragraph
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => changeViewFormat(message.id, 'bullet')}>
                                  <List className="mr-2 h-3 w-3" /> Bullet
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => changeViewFormat(message.id, 'table')}>
                                  <LayoutGrid className="mr-2 h-3 w-3" /> Table
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                        {isGreetingOnly(message.content) ? (
                          <div className="text-sm">
                            <span className="font-medium">{message.content}</span>
                            <p className="text-xs text-muted-foreground mt-1">I&apos;m here to help you with your business analytics. Ask me anything!</p>
                          </div>
                        ) : (
                          renderFormattedContent(message)
                        )}
                        {message.data && renderDataCard(message.data)}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-lg px-4 py-3">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Quick Actions Bar */}
              <div className="p-3 border-t bg-muted/30 shrink-0">
                <div className="flex gap-1 overflow-x-auto pb-1">
                  {quickActions.slice(0, 3).map((action) => (
                    <Button
                      key={action.id}
                      variant="outline"
                      size="sm"
                      className="shrink-0 text-xs"
                      onClick={() => fetchAnalytics(action.id)}
                      disabled={isLoading}
                    >
                      {action.label}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 text-xs"
                    onClick={() => setMessages([])}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
