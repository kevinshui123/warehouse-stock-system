"use client";

import React, { useCallback, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Download, ChevronDown } from "lucide-react";
import { IoClose } from "react-icons/io5";
import { FiFileText, FiGrid } from "react-icons/fi";
import { PaginationType } from "@/components/shared/PaginationSelector";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/language-context";
import { exportToExcel, exportToCSV } from "@/lib/export";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { OrderStatusDropDown } from "./OrderStatusFilter";
import { PaymentStatusDropDown } from "./PaymentStatusFilter";
import { OrderSourceDropDown, type OrderSourceFilterValue } from "./OrderSourceFilter";
import type { Order } from "@/types";

interface OrderFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  pagination: PaginationType;
  setPagination: (pagination: PaginationType) => void;
  allOrders: Order[];
  selectedStatuses: string[];
  setSelectedStatuses: React.Dispatch<React.SetStateAction<string[]>>;
  selectedPaymentStatuses: string[];
  setSelectedPaymentStatuses: React.Dispatch<React.SetStateAction<string[]>>;
  /** When set, show Order type filter (Client / Personal / View both) */
  showOrderSourceFilter?: boolean;
  orderSourceFilter?: OrderSourceFilterValue;
  setOrderSourceFilter?: (value: OrderSourceFilterValue) => void;
}


export default function OrderFilters({
  searchTerm,
  setSearchTerm,
  pagination,
  setPagination,
  allOrders,
  selectedStatuses,
  setSelectedStatuses,
  selectedPaymentStatuses,
  setSelectedPaymentStatuses,
  showOrderSourceFilter,
  orderSourceFilter = "both",
  setOrderSourceFilter,
}: OrderFiltersProps) {
  const { toast } = useToast();
  const { t } = useLanguage();

  /**
   * Filter orders based on search term and selected filters
   */
  const filteredOrders = useMemo(() => {
    return allOrders.filter((order) => {
      // Search filter
      const matchesSearch =
        !searchTerm ||
        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.notes &&
          order.notes.toLowerCase().includes(searchTerm.toLowerCase()));

      // Status filter
      const matchesStatus =
        selectedStatuses.length === 0 ||
        selectedStatuses.includes(order.status);

      // Payment status filter
      const matchesPaymentStatus =
        selectedPaymentStatuses.length === 0 ||
        selectedPaymentStatuses.includes(order.paymentStatus);

      return matchesSearch && matchesStatus && matchesPaymentStatus;
    });
  }, [allOrders, searchTerm, selectedStatuses, selectedPaymentStatuses]);

  /**
   * Export filtered orders to CSV
   * Memoized callback to prevent unnecessary re-renders
   */
  const handleExportToCSV = useCallback(() => {
    try {
      if (filteredOrders.length === 0) {
        toast({
          title: t("common.noData"),
          description: t("orders.noDataToExport"),
          variant: "destructive",
        });
        return;
      }

      const csvData = filteredOrders.map((order) => ({
        [t("orders.orderNumber")]: order.orderNumber,
        [t("orders.orderDate")]: new Date(order.createdAt).toLocaleDateString(),
        [t("orders.orderStatus")]: order.status,
        [t("orders.paymentStatus")]: order.paymentStatus,
        [t("orders.subtotal")]: order.subtotal.toFixed(2),
        [t("orders.tax")]: order.tax ? order.tax.toFixed(2) : "0.00",
        [t("orders.shipping")]: order.shipping ? order.shipping.toFixed(2) : "0.00",
        [t("orders.total")]: order.total.toFixed(2),
        [t("orders.itemsCount")]: order.items.length,
        [t("orders.trackingNumber")]: order.trackingNumber || "-",
      }));

      const columns = [
        { header: t("orders.orderNumber"), key: t("orders.orderNumber") },
        { header: t("orders.orderDate"), key: t("orders.orderDate") },
        { header: t("orders.orderStatus"), key: t("orders.orderStatus") },
        { header: t("orders.paymentStatus"), key: t("orders.paymentStatus") },
        { header: t("orders.subtotal"), key: t("orders.subtotal") },
        { header: t("orders.tax"), key: t("orders.tax") },
        { header: t("orders.shipping"), key: t("orders.shipping") },
        { header: t("orders.total"), key: t("orders.total") },
        { header: t("orders.itemsCount"), key: t("orders.itemsCount") },
        { header: t("orders.trackingNumber"), key: t("orders.trackingNumber") },
      ];

      exportToCSV(csvData, columns, "stockly-orders");

      toast({
        title: t("orders.exportCsvSuccess"),
        description: t("orders.ordersExportedCsv", { count: filteredOrders.length }),
      });
    } catch (error) {
      toast({
        title: t("common.error"),
        description: t("orders.exportFailed"),
        variant: "destructive",
      });
    }
  }, [filteredOrders, toast, t]);

  /**
   * Export filtered orders to Excel
   * Memoized callback to prevent unnecessary re-renders
   */
  const handleExportToExcel = useCallback(async () => {
    try {
      if (filteredOrders.length === 0) {
        toast({
          title: t("common.noData"),
          description: t("orders.noDataToExport"),
          variant: "destructive",
        });
        return;
      }

      const excelData = filteredOrders.map((order) => ({
        [t("orders.orderNumber")]: order.orderNumber,
        [t("orders.orderDate")]: new Date(order.createdAt).toLocaleDateString(),
        [t("orders.orderStatus")]: order.status,
        [t("orders.paymentStatus")]: order.paymentStatus,
        [t("orders.subtotal")]: order.subtotal.toFixed(2),
        [t("orders.tax")]: order.tax ? order.tax.toFixed(2) : "0.00",
        [t("orders.shipping")]: order.shipping ? order.shipping.toFixed(2) : "0.00",
        [t("orders.total")]: order.total.toFixed(2),
        [t("orders.itemsCount")]: order.items.length,
        [t("orders.trackingNumber")]: order.trackingNumber || "-",
      }));

      await exportToExcel({
        sheetName: "Orders",
        fileName: "stockly-orders",
        columns: [
          { header: t("orders.orderNumber"), key: t("orders.orderNumber"), width: 20 },
          { header: t("orders.orderDate"), key: t("orders.orderDate"), width: 12 },
          { header: t("orders.orderStatus"), key: t("orders.orderStatus"), width: 12 },
          { header: t("orders.paymentStatus"), key: t("orders.paymentStatus"), width: 15 },
          { header: t("orders.subtotal"), key: t("orders.subtotal"), width: 12 },
          { header: t("orders.tax"), key: t("orders.tax"), width: 10 },
          { header: t("orders.shipping"), key: t("orders.shipping"), width: 12 },
          { header: t("orders.total"), key: t("orders.total"), width: 12 },
          { header: t("orders.itemsCount"), key: t("orders.itemsCount"), width: 12 },
          { header: t("orders.trackingNumber"), key: t("orders.trackingNumber"), width: 20 },
        ],
        data: excelData,
      });

      toast({
        title: t("orders.exportExcelSuccess"),
        description: t("orders.ordersExportedExcel", { count: filteredOrders.length }),
      });
    } catch (error) {
      toast({
        title: t("common.error"),
        description: t("orders.exportFailed"),
        variant: "destructive",
      });
    }
  }, [filteredOrders, toast, t]);

  return (
    <div className="flex flex-col gap-4">
      {/* Single Row: Search (Left) | Filters (Middle) | Export (Right) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        {/* Search Bar - Left */}
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600 dark:text-white/60 z-10" />
          <Input
            placeholder={t("orders.searchByOrderNumber")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 pl-9 pr-10 w-full rounded-[28px] bg-white/10 dark:bg-white/5 backdrop-blur-sm border border-sky-400/30 dark:border-white/20 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-white/40 focus-visible:border-sky-400 focus-visible:ring-sky-500/50 shadow-[0_10px_30px_rgba(2,132,199,0.15)]"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchTerm("")}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 text-white/60 hover:text-white hover:bg-white/10 backdrop-blur-sm"
            >
              <IoClose className="h-4 w-4 text-gray-700 dark:text-white/60" />
            </Button>
          )}
        </div>

        {/* Filters - Middle */}
        <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
          {showOrderSourceFilter && setOrderSourceFilter && (
            <OrderSourceDropDown
              value={orderSourceFilter}
              onChange={setOrderSourceFilter}
            />
          )}
          <OrderStatusDropDown
            selectedStatuses={selectedStatuses}
            setSelectedStatuses={setSelectedStatuses}
          />
          <PaymentStatusDropDown
            selectedPaymentStatuses={selectedPaymentStatuses}
            setSelectedPaymentStatuses={setSelectedPaymentStatuses}
          />
        </div>

        {/* Export Dropdown - Right */}
        <div className="flex-shrink-0 flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                disabled={filteredOrders.length === 0}
                className="h-10 w-full sm:w-auto flex items-center gap-2 rounded-[28px] border border-violet-400/30 dark:border-violet-400/30 bg-gradient-to-r from-violet-500/25 via-violet-500/15 to-violet-500/10 dark:from-violet-500/25 dark:via-violet-500/15 dark:to-violet-500/10 text-gray-700 dark:text-white shadow-[0_10px_30px_rgba(139,92,246,0.2)] backdrop-blur-sm transition duration-200 hover:border-violet-300/40 hover:from-violet-500/35 hover:via-violet-500/25 hover:to-violet-500/15 dark:hover:border-violet-300/40 dark:hover:from-violet-500/35 dark:hover:via-violet-500/25 dark:hover:to-violet-500/15 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="h-4 w-4" />
                {t("orders.exportOrders")}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="rounded-[28px] border border-violet-400/20 dark:border-white/10 bg-white/80 dark:bg-popover/50 backdrop-blur-sm"
            >
              <DropdownMenuItem
                onClick={handleExportToCSV}
                className="cursor-pointer text-gray-700 dark:text-white/80 hover:text-gray-900 dark:hover:text-white focus:bg-violet-100 dark:focus:bg-white/10 focus:text-gray-900 dark:focus:text-white"
              >
                <FiFileText className="mr-2 h-4 w-4" />
                {t("orders.exportAsCsv")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleExportToExcel}
                className="cursor-pointer text-gray-700 dark:text-white/80 hover:text-gray-900 dark:hover:text-white focus:bg-violet-100 dark:focus:bg-white/10 focus:text-gray-900 dark:focus:text-white"
              >
                <FiGrid className="mr-2 h-4 w-4" />
                {t("orders.exportAsExcel")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
