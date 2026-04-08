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
import { InvoiceStatusDropDown } from "./InvoiceStatusFilter";
import { InvoiceSourceDropDown, type InvoiceSourceFilterValue } from "./InvoiceSourceFilter";
import type { Invoice } from "@/types";

interface InvoiceFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  pagination: PaginationType;
  setPagination: (pagination: PaginationType) => void;
  allInvoices: Invoice[];
  selectedStatuses: string[];
  setSelectedStatuses: React.Dispatch<React.SetStateAction<string[]>>;
  /** When set, show Invoice type filter (Client / Personal / View both) */
  showInvoiceSourceFilter?: boolean;
  invoiceSourceFilter?: InvoiceSourceFilterValue;
  setInvoiceSourceFilter?: (value: InvoiceSourceFilterValue) => void;
}

export default function InvoiceFilters({
  searchTerm,
  setSearchTerm,
  pagination,
  setPagination,
  allInvoices,
  selectedStatuses,
  setSelectedStatuses,
  showInvoiceSourceFilter,
  invoiceSourceFilter = "both",
  setInvoiceSourceFilter,
}: InvoiceFiltersProps) {
  const { toast } = useToast();
  const { t } = useLanguage();

  /**
   * Filter invoices based on search term and selected filters
   */
  const filteredInvoices = useMemo(() => {
    return allInvoices.filter((invoice) => {
      // Search filter
      const matchesSearch =
        !searchTerm ||
        invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (invoice.notes &&
          invoice.notes.toLowerCase().includes(searchTerm.toLowerCase()));

      // Status filter
      const matchesStatus =
        selectedStatuses.length === 0 ||
        selectedStatuses.includes(invoice.status);

      return matchesSearch && matchesStatus;
    });
  }, [allInvoices, searchTerm, selectedStatuses]);

  /**
   * Export filtered invoices to CSV
   * Memoized callback to prevent unnecessary re-renders
   */
  const handleExportToCSV = useCallback(() => {
    try {
      if (filteredInvoices.length === 0) {
        toast({
          title: t("common.noData"),
          description: t("invoices.noDataToExport"),
          variant: "destructive",
        });
        return;
      }

      const csvData = filteredInvoices.map((invoice) => ({
        [t("invoices.invoiceNumber")]: invoice.invoiceNumber,
        [t("invoices.issuedAt")]: new Date(invoice.createdAt).toLocaleDateString(),
        [t("common.status")]: invoice.status,
        [t("orders.subtotal")]: invoice.subtotal.toFixed(2),
        [t("orders.tax")]: invoice.tax ? invoice.tax.toFixed(2) : "0.00",
        [t("orders.discount")]: invoice.discount ? invoice.discount.toFixed(2) : "0.00",
        [t("orders.total")]: invoice.total.toFixed(2),
        [t("invoices.amountPaid")]: invoice.amountPaid.toFixed(2),
        [t("invoices.amountDue")]: invoice.amountDue.toFixed(2),
        [t("invoices.dueDate")]: new Date(invoice.dueDate).toLocaleDateString(),
      }));

      const columns = [
        { header: t("invoices.invoiceNumber"), key: t("invoices.invoiceNumber") },
        { header: t("invoices.issuedAt"), key: t("invoices.issuedAt") },
        { header: t("common.status"), key: t("common.status") },
        { header: t("orders.subtotal"), key: t("orders.subtotal") },
        { header: t("orders.tax"), key: t("orders.tax") },
        { header: t("orders.discount"), key: t("orders.discount") },
        { header: t("orders.total"), key: t("orders.total") },
        { header: t("invoices.amountPaid"), key: t("invoices.amountPaid") },
        { header: t("invoices.amountDue"), key: t("invoices.amountDue") },
        { header: t("invoices.dueDate"), key: t("invoices.dueDate") },
      ];

      exportToCSV(csvData, columns, "stockly-invoices");

      toast({
        title: t("invoices.exportCsvSuccess"),
        description: t("invoices.invoicesExportedCsv", { count: filteredInvoices.length }),
      });
    } catch (error) {
      toast({
        title: t("common.error"),
        description: t("invoices.exportFailed"),
        variant: "destructive",
      });
    }
  }, [filteredInvoices, toast, t]);

  /**
   * Export filtered invoices to Excel
   * Memoized callback to prevent unnecessary re-renders
   */
  const handleExportToExcel = useCallback(async () => {
    try {
      if (filteredInvoices.length === 0) {
        toast({
          title: t("common.noData"),
          description: t("invoices.noDataToExport"),
          variant: "destructive",
        });
        return;
      }

      const excelData = filteredInvoices.map((invoice) => ({
        [t("invoices.invoiceNumber")]: invoice.invoiceNumber,
        [t("invoices.issuedAt")]: new Date(invoice.createdAt).toLocaleDateString(),
        [t("common.status")]: invoice.status,
        [t("orders.subtotal")]: invoice.subtotal.toFixed(2),
        [t("orders.tax")]: invoice.tax ? invoice.tax.toFixed(2) : "0.00",
        [t("orders.discount")]: invoice.discount ? invoice.discount.toFixed(2) : "0.00",
        [t("orders.total")]: invoice.total.toFixed(2),
        [t("invoices.amountPaid")]: invoice.amountPaid.toFixed(2),
        [t("invoices.amountDue")]: invoice.amountDue.toFixed(2),
        [t("invoices.dueDate")]: new Date(invoice.dueDate).toLocaleDateString(),
      }));

      await exportToExcel({
        sheetName: "Invoices",
        fileName: "stockly-invoices",
        columns: [
          { header: t("invoices.invoiceNumber"), key: t("invoices.invoiceNumber"), width: 20 },
          { header: t("invoices.issuedAt"), key: t("invoices.issuedAt"), width: 12 },
          { header: t("common.status"), key: t("common.status"), width: 12 },
          { header: t("orders.subtotal"), key: t("orders.subtotal"), width: 12 },
          { header: t("orders.tax"), key: t("orders.tax"), width: 10 },
          { header: t("orders.discount"), key: t("orders.discount"), width: 12 },
          { header: t("orders.total"), key: t("orders.total"), width: 12 },
          { header: t("invoices.amountPaid"), key: t("invoices.amountPaid"), width: 12 },
          { header: t("invoices.amountDue"), key: t("invoices.amountDue"), width: 12 },
          { header: t("invoices.dueDate"), key: t("invoices.dueDate"), width: 12 },
        ],
        data: excelData,
      });

      toast({
        title: t("invoices.exportExcelSuccess"),
        description: t("invoices.invoicesExportedExcel", { count: filteredInvoices.length }),
      });
    } catch (error) {
      toast({
        title: t("common.error"),
        description: t("invoices.exportFailed"),
        variant: "destructive",
      });
    }
  }, [filteredInvoices, toast, t]);

  return (
    <div className="flex flex-col gap-4">
      {/* Single Row: Search (Left) | Filters (Middle) | Export (Right) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        {/* Search Bar - Left */}
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600 dark:text-white/60 z-10" />
          <Input
            placeholder={t("invoices.searchByInvoiceNumber")}
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
          {showInvoiceSourceFilter && setInvoiceSourceFilter && (
            <InvoiceSourceDropDown
              value={invoiceSourceFilter}
              onChange={setInvoiceSourceFilter}
            />
          )}
          <InvoiceStatusDropDown
            selectedStatuses={selectedStatuses}
            setSelectedStatuses={setSelectedStatuses}
          />
        </div>

        {/* Export Dropdown - Right */}
        <div className="flex-shrink-0 flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                disabled={filteredInvoices.length === 0}
                className="h-10 w-full sm:w-auto flex items-center gap-2 rounded-[28px] border border-violet-400/30 dark:border-violet-400/30 bg-gradient-to-r from-violet-500/25 via-violet-500/15 to-violet-500/10 dark:from-violet-500/25 dark:via-violet-500/15 dark:to-violet-500/10 text-gray-700 dark:text-white shadow-[0_10px_30px_rgba(139,92,246,0.2)] backdrop-blur-sm transition duration-200 hover:border-violet-300/40 hover:from-violet-500/35 hover:via-violet-500/25 hover:to-violet-500/15 dark:hover:border-violet-300/40 dark:hover:from-violet-500/35 dark:hover:via-violet-500/25 dark:hover:to-violet-500/15 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="h-4 w-4" />
                {t("invoices.exportInvoices")}
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
                {t("invoices.exportAsCsv")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleExportToExcel}
                className="cursor-pointer text-gray-700 dark:text-white/80 hover:text-gray-900 dark:hover:text-white focus:bg-violet-100 dark:focus:bg-white/10 focus:text-gray-900 dark:focus:text-white"
              >
                <FiGrid className="mr-2 h-4 w-4" />
                {t("invoices.exportAsExcel")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
