import React, { useState, useEffect } from 'react';
import { Order, SupportTicket } from '../types';
import { fetchOrders, updateOrderStatus, fetchTickets, fetchAuditLogs } from '../services/api';
import {
  Shield,
  Clock,
  CheckCircle,
  Truck,
  AlertCircle,
  RefreshCw,
  Search,
  FileText,
  MessageSquare,
  Activity,
  ChevronDown
} from 'lucide-react';

interface OperatorPanelProps {
  onExit?: () => void;
}

export const OperatorPanel: React.FC<OperatorPanelProps> = ({ onExit }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'orders' | 'tickets' | 'audit'>('orders');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusComment, setStatusComment] = useState<string>('');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [ordersData, ticketsData, logsData] = await Promise.all([
        fetchOrders('usr-test-operator-001', true),
        fetchTickets(undefined, true),
        fetchAuditLogs()
      ]);
      setOrders(ordersData);
      setTickets(ticketsData);
      setAuditLogs(logsData);
    } catch (err: any) {
      console.error('Operator load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAdvanceStatus = async (orderId: string, newStatus: string) => {
    setUpdatingOrderId(orderId);
    try {
      await updateOrderStatus(orderId, newStatus, statusComment || `Статус обновлен оператором на ${newStatus}`);
      setStatusComment('');
      await loadData();
    } catch (err: any) {
      alert('Ошибка обновления статуса: ' + err.message);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const filteredOrders = orders.filter(o =>
    o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.contactPhone.includes(searchQuery)
  );

  return (
    <div className="space-y-4 pb-20">
      {/* Operator Banner */}
      <div className="bg-[#364C49] text-white p-3.5 rounded-2xl flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-[#DD5757] text-white">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold leading-tight">
              Панель оператора • ООО «Фотопринт»
            </h2>
            <span className="text-[11px] text-[#BCBFB7]">
              Управление заказами и журналом аудита
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={loadData}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Обновить данные"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          {onExit && (
            <button
              type="button"
              onClick={onExit}
              className="px-2.5 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Выйти
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#BCBFB7]/40 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`py-2.5 px-4 border-b-2 transition-all cursor-pointer ${
            activeTab === 'orders'
              ? 'border-[#DD5757] text-[#DD5757]'
              : 'border-transparent text-[#7C807F] hover:text-[#364C49]'
          }`}
        >
          Заказы ({orders.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('tickets')}
          className={`py-2.5 px-4 border-b-2 transition-all cursor-pointer ${
            activeTab === 'tickets'
              ? 'border-[#DD5757] text-[#DD5757]'
              : 'border-transparent text-[#7C807F] hover:text-[#364C49]'
          }`}
        >
          Обращения ({tickets.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`py-2.5 px-4 border-b-2 transition-all cursor-pointer ${
            activeTab === 'audit'
              ? 'border-[#DD5757] text-[#DD5757]'
              : 'border-transparent text-[#7C807F] hover:text-[#364C49]'
          }`}
        >
          Журнал аудита ({auditLogs.length})
        </button>
      </div>

      {/* ORDERS TAB */}
      {activeTab === 'orders' && (
        <div className="space-y-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#7C807F] absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Поиск по номеру заказа, имени или телефону..."
              className="w-full bg-white border border-[#BCBFB7]/60 rounded-xl pl-9 pr-3 py-2 text-xs text-[#364C49] placeholder-[#7C807F] focus:outline-none focus:border-[#DD5757]"
            />
          </div>

          {/* Orders list */}
          <div className="space-y-2.5">
            {filteredOrders.slice(0, 15).map(order => (
              <div
                key={order.id}
                className="bg-white rounded-2xl p-3.5 border border-[#BCBFB7]/50 shadow-xs space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-extrabold text-sm text-[#364C49]">
                      #{order.orderNumber}
                    </span>
                    <span className="text-[11px] text-[#7C807F] block">
                      {order.contactName} • {order.contactPhone}
                    </span>
                  </div>
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                    order.status === 'completed'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : order.status === 'production'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-[#F6EFE6] text-[#364C49] border-[#BCBFB7]/60'
                  }`}>
                    {order.status}
                  </span>
                </div>

                <div className="text-xs text-[#7C807F] flex items-center justify-between border-t border-[#BCBFB7]/30 pt-2">
                  <span>Доставка: {order.deliveryMethod}</span>
                  <span className="font-extrabold text-sm text-[#364C49]">
                    {order.totalAmount.toFixed(2)} BYN
                  </span>
                </div>

                {/* Status Changer Actions */}
                <div className="pt-1 flex items-center space-x-1.5 overflow-x-auto no-scrollbar">
                  {[
                    { key: 'moderation', label: 'Модерация' },
                    { key: 'production', label: 'В печать' },
                    { key: 'ready_for_delivery', label: 'Готов' },
                    { key: 'completed', label: 'Доставлен' }
                  ].map(st => (
                    <button
                      key={st.key}
                      type="button"
                      disabled={updatingOrderId === order.id}
                      onClick={() => handleAdvanceStatus(order.id, st.key)}
                      className="px-2.5 py-1 rounded-lg bg-[#F6EFE6] hover:bg-[#EAECE7] text-[11px] font-bold text-[#364C49] border border-[#BCBFB7]/60 whitespace-nowrap cursor-pointer transition-colors"
                    >
                      → {st.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TICKETS TAB */}
      {activeTab === 'tickets' && (
        <div className="space-y-2.5">
          {tickets.slice(0, 15).map(ticket => (
            <div key={ticket.id} className="bg-white p-3.5 rounded-2xl border border-[#BCBFB7]/50 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#364C49]">
                  {ticket.ticketNumber} • Заказ #{ticket.orderNumber || 'без заказа'}
                </span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#F6EFE6] text-[#DD5757]">
                  {ticket.status}
                </span>
              </div>
              <h4 className="text-xs font-bold text-[#364C49]">{ticket.subject}</h4>
              <p className="text-xs text-[#7C807F] leading-relaxed">{ticket.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* AUDIT LOG TAB */}
      {activeTab === 'audit' && (
        <div className="space-y-2">
          {auditLogs.slice(0, 20).map(log => (
            <div key={log.id} className="bg-white p-2.5 rounded-xl border border-[#BCBFB7]/40 text-xs flex items-start space-x-2">
              <Activity className="w-4 h-4 text-[#DD5757] shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex justify-between">
                  <span className="font-bold text-[#364C49]">{log.action}</span>
                  <span className="text-[10px] text-[#7C807F]">{new Date(log.timestamp).toLocaleTimeString('ru-RU')}</span>
                </div>
                <span className="text-[11px] text-[#7C807F] block">
                  Сущность: {log.entity_type} ({log.entity_id}) • {log.result}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
