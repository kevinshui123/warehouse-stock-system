/**
 * Statistics Section Component
 * Displays store-wide (self + client + supplier + other users) stats cards
 * matching admin dashboard-overall-insights. Uses dashboard API only.
 */

"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Package,
  FolderTree,
  Truck,
  DollarSign,
  ShoppingCart,
  FileText,
  Warehouse,
} from "lucide-react";
import { StatisticsCard } from "./StatisticsCard";
import { StatisticsCardSkeleton } from "./StatisticsCardSkeleton";
import { useDashboard } from "@/hooks/queries/use-dashboard";
import { useLanguage } from "@/contexts/language-context";

const formatCurrency = (value: number) =>
  `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/**
 * StatisticsSection — 8 cards in same order and format as admin dashboard-overall-insights.
 * Store-wide data (self + client + supplier + other users). Skeleton on dashboard load only.
 */
export function StatisticsSection() {
  const isMountedRef = useRef(false);
  const [isMounted, setIsMounted] = useState(false);
  const { t } = useLanguage();

  const dashboardQuery = useDashboard();
  const stats = dashboardQuery.data ?? null;

  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      queueMicrotask(() => setIsMounted(true));
    }
  }, []);

  const isLoading = !isMounted || dashboardQuery.isPending;
  const revenueFromOrders =
    stats?.orderAnalytics?.totalRevenueExcludingCancelled ??
    stats?.revenue?.fromOrders ??
    0;
  const selfOthers = stats?.selfOthersBreakdown;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
      {isLoading ? (
        <>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <StatisticsCardSkeleton key={i} />
          ))}
        </>
      ) : stats ? (
        <>
          <StatisticsCard
            title={t("dashboard.totalProducts")}
            value={stats.counts?.products ?? 0}
            description={t("home.stats.productsAvailability")}
            icon={Package}
            variant="rose"
            badges={[
              { label: t("products.available"), value: stats.productStatusBreakdown?.available ?? 0 },
              { label: t("products.stockLow"), value: stats.productStatusBreakdown?.stockLow ?? 0 },
              { label: t("products.stockOut"), value: stats.productStatusBreakdown?.stockOut ?? 0 },
            ]}
          />
          <StatisticsCard
            title={t("home.stats.totalValue")}
            value={formatCurrency(stats.totalInventoryValue ?? 0)}
            description={t("home.stats.totalInventoryValue")}
            icon={DollarSign}
            variant="violet"
            badges={[
              {
                label: t("home.stats.orders"),
                value: formatCurrency(
                  stats.orderAnalytics?.totalRevenueExcludingCancelled ??
                    stats.revenue?.fromOrders ??
                    0,
                ),
              },
              { label: t("home.stats.invoices"), value: formatCurrency(stats.revenue?.fromInvoices ?? 0) },
              {
                label: t("home.stats.due"),
                value: formatCurrency(stats.invoiceAnalytics?.outstandingAmount ?? 0),
              },
              {
                label: t("orders.cancelled"),
                value: formatCurrency(stats.orderAnalytics?.cancelledOrderAmount ?? 0),
              },
            ]}
          />
          <StatisticsCard
            title={t("home.stats.totalRevenue")}
            value={formatCurrency(revenueFromOrders)}
            description={t("home.stats.profitsExclCancelled")}
            icon={DollarSign}
            variant="emerald"
            badges={[
              {
                label: t("home.stats.paid"),
                value: formatCurrency(stats.orderAnalytics?.paidOrderAmount ?? 0),
              },
              {
                label: t("home.stats.due"),
                value: formatCurrency(stats.invoiceAnalytics?.outstandingAmount ?? 0),
              },
              {
                label: t("home.stats.refund"),
                value: formatCurrency(stats.orderAnalytics?.refundedAmount ?? 0),
              },
              {
                label: t("home.stats.pending"),
                value: formatCurrency(stats.orderAnalytics?.pendingOrderAmount ?? 0),
              },
              ...(selfOthers
                ? [
                    { label: t("home.stats.self"), value: formatCurrency(selfOthers.revenueSelf) },
                    { label: t("home.stats.others"), value: formatCurrency(selfOthers.revenueOthers) },
                  ]
                : []),
            ]}
          />
          <StatisticsCard
            title={t("dashboard.totalOrders")}
            value={stats.counts?.orders}
            description={t("home.stats.totalOrdersDesc")}
            icon={ShoppingCart}
            variant="blue"
            badges={[
              {
                label: t("home.stats.pending"),
                value: stats.orderAnalytics?.statusDistribution?.pending ?? 0,
              },
              {
                label: t("home.stats.confirmed"),
                value: stats.orderAnalytics?.statusDistribution?.confirmed ?? 0,
              },
              {
                label: t("home.stats.shipping"),
                value:
                  (stats.orderAnalytics?.statusDistribution?.processing ?? 0) +
                  (stats.orderAnalytics?.statusDistribution?.shipped ?? 0),
              },
              { label: t("home.stats.refundCount"), value: stats.orderAnalytics?.refundedCount ?? 0 },
              {
                label: t("home.stats.cancelShort"),
                value: stats.orderAnalytics?.statusDistribution?.cancelled ?? 0,
              },
              ...(selfOthers
                ? [
                    { label: t("home.stats.self"), value: selfOthers.orderSelfCount },
                    { label: t("home.stats.others"), value: selfOthers.orderOthersCount },
                  ]
                : []),
            ]}
          />
          <StatisticsCard
            title={t("dashboard.totalInvoices")}
            value={stats.counts?.invoices}
            description={t("home.stats.totalInvoicesDesc")}
            icon={FileText}
            variant="sky"
            badges={[
              {
                label: t("home.stats.paid"),
                value: stats.invoiceAnalytics?.statusDistribution?.paid ?? 0,
              },
              {
                label: t("home.stats.pending"),
                value:
                  (stats.invoiceAnalytics?.statusDistribution?.draft ?? 0) +
                  (stats.invoiceAnalytics?.statusDistribution?.sent ?? 0),
              },
              {
                label: t("home.stats.overdue"),
                value: stats.invoiceAnalytics?.statusDistribution?.overdue ?? 0,
              },
              {
                label: t("orders.cancelled"),
                value: stats.invoiceAnalytics?.statusDistribution?.cancelled ?? 0,
              },
              { label: t("home.stats.refunded"), value: stats.orderAnalytics?.refundedCount ?? 0 },
              ...(selfOthers
                ? [
                    { label: t("home.stats.self"), value: selfOthers.invoiceSelfCount },
                    { label: t("home.stats.others"), value: selfOthers.invoiceOthersCount },
                  ]
                : []),
            ]}
          />
          <StatisticsCard
            title={t("home.stats.totalWarehouses")}
            value={stats.counts?.warehouses}
            description={t("home.stats.storageLocations")}
            icon={Warehouse}
            variant="teal"
            badges={[
              { label: t("common.active"), value: stats.warehouseAnalytics?.activeWarehouses ?? 0 },
              { label: t("common.inactive"), value: stats.warehouseAnalytics?.inactiveWarehouses ?? 0 },
            ]}
          />
          <StatisticsCard
            title={t("dashboard.totalSuppliers")}
            value={stats.counts?.suppliers}
            description={t("home.stats.suppliersOnly")}
            icon={Truck}
            variant="emerald"
            badges={[
              { label: t("common.active"), value: stats.supplierStatusBreakdown?.active ?? 0 },
              { label: t("common.inactive"), value: stats.supplierStatusBreakdown?.inactive ?? 0 },
            ]}
          />
          <StatisticsCard
            title={t("home.stats.categoriesTitle")}
            value={stats.counts?.categories}
            description={t("home.stats.productCategories")}
            icon={FolderTree}
            variant="amber"
            badges={[
              { label: t("common.active"), value: stats.categoryStatusBreakdown?.active ?? 0 },
              { label: t("common.inactive"), value: stats.categoryStatusBreakdown?.inactive ?? 0 },
            ]}
          />
        </>
      ) : null}
    </div>
  );
}
