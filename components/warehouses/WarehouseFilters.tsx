"use client";

import React, { useMemo, useCallback, useState, useLayoutEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Download, ChevronDown } from "lucide-react";
import { IoClose } from "react-icons/io5";
import { FiFileText, FiGrid } from "react-icons/fi";
import { Warehouse } from "@/types";
import { PaginationType } from "@/components/shared/PaginationSelector";
import { useLanguage } from "@/contexts/language-context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import Papa from "papaparse";
import ExcelJS from "exceljs";

type StatusFilter = "all" | "active" | "inactive";

type WarehouseFiltersProps = {
  allWarehouses: Warehouse[];
  statusFilter: StatusFilter;
  setStatusFilter: (filter: StatusFilter) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  pagination: PaginationType;
  setPagination: (
    updater: PaginationType | ((old: PaginationType) => PaginationType),
  ) => void;
};

export default function WarehouseFilters({
  allWarehouses,
  statusFilter,
  setStatusFilter,
  searchTerm,
  setSearchTerm,
  pagination,
  setPagination,
}: WarehouseFiltersProps) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [selectMounted, setSelectMounted] = useState(false);

  useLayoutEffect(() => {
    const t = setTimeout(() => setSelectMounted(true), 0);
    return () => clearTimeout(t);
  }, []);

  /**
   * Filter warehouses based on current filters
   */
  const filteredWarehouses = useMemo(() => {
    return allWarehouses.filter((warehouse) => {
      const searchMatch =
        !searchTerm ||
        warehouse.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (warehouse.address &&
          warehouse.address.toLowerCase().includes(searchTerm.toLowerCase()));

      const statusMatch =
        statusFilter === "all" ||
        (statusFilter === "active" && warehouse.status === true) ||
        (statusFilter === "inactive" && warehouse.status === false);

      return searchMatch && statusMatch;
    });
  }, [allWarehouses, searchTerm, statusFilter]);

  /**
   * Export filtered warehouses to CSV
   */
  const exportToCSV = useCallback(() => {
    try {
      if (filteredWarehouses.length === 0) {
        toast({
          title: t("common.noData"),
          description: t("warehouses.noDataToExport"),
          variant: "destructive",
        });
        return;
      }

      const csvData = filteredWarehouses.map((warehouse) => ({
        [t("warehouses.warehouseName")]: warehouse.name,
        [t("common.status")]: warehouse.status ? t("common.active") : t("common.inactive"),
        [t("warehouses.address")]: warehouse.address || "-",
        [t("warehouses.type")]: warehouse.type || "-",
        [t("common.createdAt")]: warehouse.createdAt
          ? new Date(warehouse.createdAt).toLocaleDateString()
          : "-",
        [t("common.updatedAt")]: warehouse.updatedAt
          ? new Date(warehouse.updatedAt).toLocaleDateString()
          : "-",
      }));

      const csv = Papa.unparse(csvData);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `warehouses_${new Date().toISOString().split("T")[0]}.csv`,
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: t("warehouses.exportSuccess"),
        description: t("warehouses.warehousesExportedCsv", { count: filteredWarehouses.length }),
      });
    } catch (error) {
      toast({
        title: t("common.error"),
        description: t("warehouses.exportFailed"),
        variant: "destructive",
      });
    }
  }, [filteredWarehouses, toast, t]);

  /**
   * Export filtered warehouses to Excel
   */
  const exportToExcel = useCallback(async () => {
    try {
      if (filteredWarehouses.length === 0) {
        toast({
          title: t("common.noData"),
          description: t("warehouses.noDataToExport"),
          variant: "destructive",
        });
        return;
      }

      const excelData = filteredWarehouses.map((warehouse) => ({
        [t("warehouses.warehouseName")]: warehouse.name,
        [t("common.status")]: warehouse.status ? t("common.active") : t("common.inactive"),
        [t("warehouses.address")]: warehouse.address || "-",
        [t("warehouses.type")]: warehouse.type || "-",
        [t("common.createdAt")]: warehouse.createdAt
          ? new Date(warehouse.createdAt).toLocaleDateString()
          : "-",
        [t("common.updatedAt")]: warehouse.updatedAt
          ? new Date(warehouse.updatedAt).toLocaleDateString()
          : "-",
      }));

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Warehouses");

      worksheet.columns = [
        { header: t("warehouses.warehouseName"), key: t("warehouses.warehouseName"), width: 25 },
        { header: t("common.status"), key: t("common.status"), width: 12 },
        { header: t("warehouses.address"), key: t("warehouses.address"), width: 40 },
        { header: t("warehouses.type"), key: t("warehouses.type"), width: 15 },
        { header: t("common.createdAt"), key: t("common.createdAt"), width: 12 },
        { header: t("common.updatedAt"), key: t("common.updatedAt"), width: 12 },
      ];

      worksheet.addRows(excelData);

      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" },
      };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `warehouses_${new Date().toISOString().split("T")[0]}.xlsx`,
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: t("warehouses.exportSuccess"),
        description: t("warehouses.warehousesExportedExcel", { count: filteredWarehouses.length }),
      });
    } catch (error) {
      toast({
        title: t("common.error"),
        description: t("warehouses.exportFailed"),
        variant: "destructive",
      });
    }
  }, [filteredWarehouses, toast, t]);

  return (
    <div className="flex flex-col gap-4">
      {/* Single Row: Search (Left) | Filters (Middle) | Export (Right) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
        {/* Search Bar - Left */}
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600 dark:text-white/60 z-10" />
          <Input
            placeholder={t("warehouses.searchByName")}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPagination((prev) => ({ ...prev, pageIndex: 0 }));
            }}
            className="h-10 pl-9 pr-10 w-full rounded-[28px] bg-white/10 dark:bg-white/5 backdrop-blur-sm border border-teal-400/30 dark:border-white/20 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-white/40 focus-visible:border-teal-400 focus-visible:ring-teal-500/50 shadow-[0_10px_30px_rgba(20,184,166,0.15)]"
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

        {/* Status Filter - Middle (defer Select until mount to avoid Radix aria-controls hydration mismatch) */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {!selectMounted ? (
            <div
              className="h-10 w-full sm:w-[180px] rounded-[28px] border border-cyan-400/30 dark:border-cyan-400/30 bg-gradient-to-r from-cyan-500/25 via-cyan-500/15 to-cyan-500/10 dark:from-cyan-500/25 dark:via-cyan-500/15 dark:to-cyan-500/10 text-gray-700 dark:text-white shadow-[0_10px_30px_rgba(6,182,212,0.2)] backdrop-blur-sm font-medium flex items-center justify-between px-3 py-2.5 text-sm"
              aria-hidden
            >
              <span className="text-gray-700 dark:text-white/90">
                {statusFilter === "all"
                  ? t("warehouses.allWarehouses")
                  : statusFilter === "active"
                    ? t("common.active")
                    : t("common.inactive")}
              </span>
              <ChevronDown className="h-4 w-4 opacity-70" />
            </div>
          ) : (
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value as StatusFilter);
                setPagination((prev) => ({ ...prev, pageIndex: 0 }));
              }}
            >
              <SelectTrigger className="h-10 w-full sm:w-[180px] rounded-[28px] border border-cyan-400/30 dark:border-cyan-400/30 bg-gradient-to-r from-cyan-500/25 via-cyan-500/15 to-cyan-500/10 dark:from-cyan-500/25 dark:via-cyan-500/15 dark:to-cyan-500/10 text-gray-700 dark:text-white shadow-[0_10px_30px_rgba(6,182,212,0.2)] backdrop-blur-sm transition duration-200 hover:border-cyan-300/40 hover:from-cyan-500/35 hover:via-cyan-500/25 hover:to-cyan-500/15 dark:hover:border-cyan-300/40 dark:hover:from-cyan-500/35 dark:hover:via-cyan-500/25 dark:hover:to-cyan-500/15 font-medium">
                <SelectValue placeholder={t("warehouses.allWarehouses")} />
              </SelectTrigger>
              <SelectContent className="rounded-[28px] border border-cyan-400/20 dark:border-white/10 bg-white/80 dark:bg-popover/50 backdrop-blur-sm shadow-[0_10px_30px_rgba(6,182,212,0.15)]">
                <SelectItem
                  value="all"
                  className="text-gray-700 dark:text-white/80 focus:bg-cyan-100 dark:focus:bg-white/10 focus:text-gray-900 dark:focus:text-white"
                >
                  {t("warehouses.allWarehouses")}
                </SelectItem>
                <SelectItem
                  value="active"
                  className="text-gray-700 dark:text-white/80 focus:bg-cyan-100 dark:focus:bg-white/10 focus:text-gray-900 dark:focus:text-white"
                >
                  {t("common.active")}
                </SelectItem>
                <SelectItem
                  value="inactive"
                  className="text-gray-700 dark:text-white/80 focus:bg-cyan-100 dark:focus:bg-white/10 focus:text-gray-900 dark:focus:text-white"
                >
                  {t("common.inactive")}
                </SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Export Dropdown - Right */}
        <div className="flex-shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-10 w-full sm:w-auto flex items-center gap-2 rounded-[28px] border border-teal-400/30 dark:border-teal-400/30 bg-gradient-to-r from-teal-500/25 via-teal-500/15 to-teal-500/10 dark:from-teal-500/25 dark:via-teal-500/15 dark:to-teal-500/10 text-gray-700 dark:text-white shadow-[0_10px_30px_rgba(20,184,166,0.2)] backdrop-blur-sm transition duration-200 hover:border-teal-300/40 hover:from-teal-500/35 hover:via-teal-500/25 hover:to-teal-500/15 dark:hover:border-teal-300/40 dark:hover:from-teal-500/35 dark:hover:via-teal-500/25 dark:hover:to-teal-500/15"
              >
                <Download className="h-4 w-4" />
                {t("warehouses.exportWarehouses")}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="rounded-[28px] border border-teal-400/20 dark:border-white/10 bg-white/80 dark:bg-popover/50 backdrop-blur-sm"
            >
              <DropdownMenuItem
                onClick={exportToCSV}
                className="cursor-pointer text-gray-700 dark:text-white/80 hover:text-gray-900 dark:hover:text-white focus:bg-teal-100 dark:focus:bg-white/10 focus:text-gray-900 dark:focus:text-white"
              >
                <FiFileText className="mr-2 h-4 w-4" />
                {t("warehouses.exportAsCsv")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={exportToExcel}
                className="cursor-pointer text-gray-700 dark:text-white/80 hover:text-gray-900 dark:hover:text-white focus:bg-teal-100 dark:focus:bg-white/10 focus:text-gray-900 dark:focus:text-white"
              >
                <FiGrid className="mr-2 h-4 w-4" />
                {t("warehouses.exportAsExcel")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Filter Area - Active Filters Display */}
      <FilterArea
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
      />
    </div>
  );
}

/**
 * FilterArea Component
 * Displays active filters with reset functionality
 */
function FilterArea({
  statusFilter,
  setStatusFilter,
}: {
  statusFilter: StatusFilter;
  setStatusFilter: (filter: StatusFilter) => void;
}) {
  const { t } = useLanguage();
  const hasActiveFilter = statusFilter !== "all";

  if (!hasActiveFilter) return null;

  return (
    <div className="flex flex-col sm:flex-row gap-3 poppins">
      {/* Status Filter */}
      {hasActiveFilter && (
        <div className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-teal-400/30 bg-gradient-to-r from-teal-500/25 via-teal-500/10 to-teal-500/5 text-gray-700 dark:text-white rounded-md backdrop-blur-sm shadow-[0_10px_30px_rgba(20,184,166,0.2)]">
          <span className="text-gray-700 dark:text-white/80">{t("common.status")}:</span>
          <div className="flex gap-1 items-center">
            <Badge className="border border-teal-400/30 bg-gradient-to-r from-teal-500/25 via-teal-500/10 to-teal-500/5 text-white backdrop-blur-sm">
              {statusFilter === "active" ? t("common.active") : t("common.inactive")}
            </Badge>
          </div>
          <button
            onClick={() => setStatusFilter("all")}
            className="ml-1 hover:text-gray-700 dark:hover:text-white/80 transition-colors"
          >
            <IoClose className="h-3 w-3 text-gray-700 dark:text-white" />
          </button>
        </div>
      )}

      {/* Reset Filters Button */}
      {hasActiveFilter && (
        <Button
          onClick={() => {
            setStatusFilter("all");
          }}
          variant={"ghost"}
          className="p-1 px-2 text-gray-700 dark:text-white/80 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 backdrop-blur-sm"
        >
          <span>{t("common.reset")}</span>
          <IoClose className="h-3 w-3 text-gray-700 dark:text-white" />
        </Button>
      )}
    </div>
  );
}
