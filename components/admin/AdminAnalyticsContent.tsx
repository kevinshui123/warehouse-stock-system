"use client";

import React, { useLayoutEffect, useCallback, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ChartCard } from "@/components/ui/chart-card";
import { StatisticsCard } from "@/components/home/StatisticsCard";
import { StatisticsCardSkeleton } from "@/components/home/StatisticsCardSkeleton";
import { PageContentWrapper } from "@/components/shared";
import { useDashboard } from "@/hooks/queries";
import { queryKeys } from "@/lib/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts";
import {
  Package,
  Users,
  Truck,
  FolderTree,
  ShoppingCart,
  FileText,
  Warehouse,
  MessageSquare,
  Star,
  DollarSign,
  BarChart3,
  TrendingUp,
  Sparkles,
  Loader2,
  ArrowRight,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ResponsiveChartContainer } from "@/components/ui/responsive-chart-container";
import { format } from "date-fns";
import type { DashboardStats } from "@/types";
import ForecastingSection from "@/components/admin/ForecastingSection";
import { useLanguage } from "@/contexts/language-context";

function formatCurrency(value: number): string {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export type AdminAnalyticsContentProps = {
  initialStats?: DashboardStats | null;
};

export default function AdminAnalyticsContent({
  initialStats,
}: AdminAnalyticsContentProps = {}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { isCheckingAuth, user } = useAuth();
  const { t } = useLanguage();
  const dashboardQuery = useDashboard();
  const stats = dashboardQuery.data ?? initialStats ?? null;

  useLayoutEffect(() => {
    if (initialStats != null && user?.id) {
      queryClient.setQueryData(
        queryKeys.dashboard.overview(user.id),
        initialStats,
      );
    }
  }, [queryClient, initialStats, user?.id]);

  const [aiText, setAiText] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiUnavailable, setAiUnavailable] = useState(false);

  const buildAiSummary = useCallback(() => {
    if (!stats) return "";
    const c = stats.counts ?? {};
    const r = stats.revenue ?? {};
    const totalRev = (r.fromOrders ?? 0) + (r.fromInvoices ?? 0);
    const parts = [
      `Products: ${c.products ?? 0}. Users: ${c.users ?? 0}. Suppliers: ${c.suppliers ?? 0}. Categories: ${c.categories ?? 0}.`,
      `Orders: ${c.orders ?? 0}. Invoices: ${c.invoices ?? 0}. Warehouses: ${c.warehouses ?? 0}.`,
      `Support tickets: ${c.tickets ?? 0}. Product reviews: ${c.reviews ?? 0}.`,
      `Total revenue (orders + invoices): $${totalRev.toLocaleString()}.`,
    ];
    const last = stats.trends?.[stats.trends.length - 1];
    if (last) {
      parts.push(
        `Last month trend: ${last.orders} orders, $${last.revenue.toLocaleString()} revenue, ${last.products} new products, ${last.invoices} invoices.`,
      );
    }
    return parts.join(" ");
  }, [stats]);

  const handleGenerateAiInsights = useCallback(async () => {
    setAiLoading(true);
    setAiUnavailable(false);
    setAiText(null);
    try {
      const summary = buildAiSummary();
      const res = await fetch("/api/ai/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ summary }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 503) {
          setAiUnavailable(true);
          toast({
            title: "AI insights not configured",
            description:
              "Set OPENROUTER_API_KEY in .env to enable AI-powered insights.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Failed to generate insights",
            description: (data?.error as string) ?? "Please try again.",
            variant: "destructive",
          });
        }
        return;
      }
      const text = (data?.data as { text?: string })?.text;
      if (text) {
        setAiText(text);
        toast({
          title: "AI insights generated",
          description: "Recommendations are ready.",
        });
      }
    } catch {
      toast({
        title: "Failed to generate insights",
        description: "Network error. Please try again.",
        variant: "destructive",
      });
    } finally {
      setAiLoading(false);
    }
  }, [buildAiSummary, toast]);

  const showSkeleton = isCheckingAuth || dashboardQuery.isPending;
  const revenueFromOrders =
    stats?.orderAnalytics?.totalRevenueExcludingCancelled ??
    stats?.revenue?.fromOrders ??
    0;

  return (
    <PageContentWrapper>
      <div className="space-y-6">
        <div className="flex flex-col items-start text-left pb-2">
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white pb-1">
            Store Analytics &amp; Dashboard (self + client + supplier + other
            users)
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Overview, statistics, trends, and AI-powered insights across
            products, users, suppliers, categories, orders, invoices,
            warehouses, tickets, and reviews. Store-wide metrics.
          </p>
        </div>

        {/* Overview cards — max 3 per row on admin (sidebar); same height via h-full */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
          {showSkeleton ? (
            <>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
                <StatisticsCardSkeleton key={i} />
              ))}
            </>
          ) : stats ? (
            <>
              <StatisticsCard
                title={t("admin.analytics.totalProducts")}
                value={stats.counts?.products}
                description={t("admin.analytics.productsAvailability")}
                icon={Package}
                variant="rose"
                badges={[
                  {
                    label: t("products.available"),
                    value: stats.productStatusBreakdown?.available ?? 0,
                  },
                  {
                    label: t("products.stockLow"),
                    value: stats.productStatusBreakdown?.stockLow ?? 0,
                  },
                  {
                    label: t("products.stockOut"),
                    value: stats.productStatusBreakdown?.stockOut ?? 0,
                  },
                ]}
              />
              <StatisticsCard
                title={t("admin.analytics.totalValue")}
                value={formatCurrency(stats.totalInventoryValue ?? 0)}
                description={t("admin.analytics.totalInventoryValue")}
                icon={DollarSign}
                variant="violet"
                badges={[
                  {
                    label: t("orders.orders"),
                    value: formatCurrency(
                      stats.orderAnalytics?.totalRevenueExcludingCancelled ??
                        stats.revenue?.fromOrders ??
                        0,
                    ),
                  },
                  {
                    label: t("invoices.invoices"),
                    value: formatCurrency(stats.revenue?.fromInvoices ?? 0),
                  },
                  {
                    label: t("admin.analytics.due"),
                    value: formatCurrency(
                      stats.invoiceAnalytics?.outstandingAmount ?? 0,
                    ),
                  },
                  {
                    label: t("orders.cancelled"),
                    value: formatCurrency(
                      stats.orderAnalytics?.cancelledOrderAmount ?? 0,
                    ),
                  },
                ]}
              />
              <StatisticsCard
                title={t("admin.analytics.totalRevenue")}
                value={formatCurrency(revenueFromOrders)}
                description={t("admin.analytics.profitsExclCancelled")}
                icon={DollarSign}
                variant="emerald"
                badges={[
                  {
                    label: t("orders.paid"),
                    value: formatCurrency(
                      stats.orderAnalytics?.paidOrderAmount ?? 0,
                    ),
                  },
                  {
                    label: t("admin.analytics.due"),
                    value: formatCurrency(
                      stats.invoiceAnalytics?.outstandingAmount ?? 0,
                    ),
                  },
                  {
                    label: t("admin.analytics.refund"),
                    value: formatCurrency(
                      stats.orderAnalytics?.refundedAmount ?? 0,
                    ),
                  },
                  {
                    label: t("orders.pending"),
                    value: formatCurrency(
                      stats.orderAnalytics?.pendingOrderAmount ?? 0,
                    ),
                  },
                ]}
              />
              <StatisticsCard
                title={t("admin.analytics.totalOrders")}
                value={stats.counts?.orders}
                description={t("admin.analytics.totalOrdersPlaced")}
                icon={ShoppingCart}
                variant="blue"
                badges={[
                  {
                    label: t("orders.pending"),
                    value:
                      stats.orderAnalytics?.statusDistribution?.pending ?? 0,
                  },
                  {
                    label: t("orders.confirmed"),
                    value:
                      stats.orderAnalytics?.statusDistribution?.confirmed ?? 0,
                  },
                  {
                    label: t("orders.shipping"),
                    value:
                      (stats.orderAnalytics?.statusDistribution?.processing ??
                        0) +
                      (stats.orderAnalytics?.statusDistribution?.shipped ?? 0),
                  },
                  {
                    label: t("orders.refunded"),
                    value: stats.orderAnalytics?.refundedCount ?? 0,
                  },
                  {
                    label: t("home.stats.cancelShort"),
                    value:
                      stats.orderAnalytics?.statusDistribution?.cancelled ?? 0,
                  },
                ]}
              />
              <StatisticsCard
                title={t("admin.adminDashboard.totalUsers")}
                value={stats.counts?.users}
                description={t("admin.analytics.registeredUsers")}
                icon={Users}
                variant="amber"
                badges={[
                  {
                    label: t("admin.analytics.admin"),
                    value: stats.userRoleBreakdown?.admin ?? 0,
                  },
                  {
                    label: t("admin.analytics.client"),
                    value: stats.userRoleBreakdown?.client ?? 0,
                  },
                  {
                    label: t("admin.analytics.supplier"),
                    value: stats.userRoleBreakdown?.supplier ?? 0,
                  },
                ]}
              />
              <StatisticsCard
                title={t("admin.adminDashboard.totalSuppliers")}
                value={stats.counts?.suppliers}
                description={t("admin.analytics.suppliers")}
                icon={Truck}
                variant="emerald"
                badges={[
                  {
                    label: t("common.active"),
                    value: stats.supplierStatusBreakdown?.active ?? 0,
                  },
                  {
                    label: t("common.inactive"),
                    value: stats.supplierStatusBreakdown?.inactive ?? 0,
                  },
                ]}
              />
              <StatisticsCard
                title={t("admin.adminDashboard.totalWarehouses")}
                value={stats.counts?.warehouses}
                description={t("admin.analytics.storageLocations")}
                icon={Warehouse}
                variant="teal"
                badges={[
                  {
                    label: t("common.active"),
                    value: stats.warehouseAnalytics?.activeWarehouses ?? 0,
                  },
                  {
                    label: t("common.inactive"),
                    value: stats.warehouseAnalytics?.inactiveWarehouses ?? 0,
                  },
                ]}
              />
              <StatisticsCard
                title={t("invoices.invoices")}
                value={stats.counts?.invoices}
                description={t("admin.analytics.totalInvoices")}
                icon={FileText}
                variant="sky"
                badges={[
                  {
                    label: t("orders.paid"),
                    value:
                      stats.invoiceAnalytics?.statusDistribution?.paid ?? 0,
                  },
                  {
                    label: t("orders.pending"),
                    value:
                      (stats.invoiceAnalytics?.statusDistribution?.draft ?? 0) +
                      (stats.invoiceAnalytics?.statusDistribution?.sent ?? 0),
                  },
                  {
                    label: t("invoices.overdue"),
                    value:
                      stats.invoiceAnalytics?.statusDistribution?.overdue ?? 0,
                  },
                  {
                    label: t("orders.cancelled"),
                    value:
                      stats.invoiceAnalytics?.statusDistribution?.cancelled ??
                      0,
                  },
                  {
                    label: t("orders.refunded"),
                    value: stats.orderAnalytics?.refundedCount ?? 0,
                  },
                ]}
              />
              <StatisticsCard
                title={t("admin.analytics.categoriesTitle")}
                value={stats.counts?.categories}
                description={t("admin.analytics.productCategories")}
                icon={FolderTree}
                variant="amber"
                badges={[
                  {
                    label: t("common.active"),
                    value: stats.categoryStatusBreakdown?.active ?? 0,
                  },
                  {
                    label: t("common.inactive"),
                    value: stats.categoryStatusBreakdown?.inactive ?? 0,
                  },
                ]}
              />
              <StatisticsCard
                title={t("support.supportTickets")}
                value={stats.counts?.tickets}
                description={t("support.tickets")}
                icon={MessageSquare}
                variant="rose"
                badges={[
                  {
                    label: t("support.open"),
                    value: stats.ticketStatusBreakdown?.open ?? 0,
                  },
                  {
                    label: t("support.inProgress"),
                    value: stats.ticketStatusBreakdown?.in_progress ?? 0,
                  },
                  {
                    label: t("support.resolved"),
                    value: stats.ticketStatusBreakdown?.resolved ?? 0,
                  },
                  {
                    label: t("support.closed"),
                    value: stats.ticketStatusBreakdown?.closed ?? 0,
                  },
                ]}
              />
              <StatisticsCard
                title={t("admin.analytics.reviews")}
                value={stats.counts?.reviews}
                description={t("admin.analytics.productReviews")}
                icon={Star}
                variant="orange"
                badges={[
                  {
                    label: t("orders.pending"),
                    value: stats.reviewStatusBreakdown?.pending ?? 0,
                  },
                  {
                    label: t("admin.analytics.approved"),
                    value: stats.reviewStatusBreakdown?.approved ?? 0,
                  },
                  {
                    label: t("admin.analytics.rejected"),
                    value: stats.reviewStatusBreakdown?.rejected ?? 0,
                  },
                ]}
              />
              <StatisticsCard
                title={t("admin.analytics.averageOrderValue")}
                value={formatCurrency(
                  stats.orderAnalytics?.averageOrderValue ?? 0,
                )}
                description={t("admin.analytics.perOrder")}
                icon={DollarSign}
                variant="sky"
                badges={[
                  {
                    label: t("admin.analytics.paidRevenue"),
                    value: formatCurrency(
                      stats.invoiceAnalytics?.paidRevenue ?? 0,
                    ),
                  },
                  {
                    label: t("admin.analytics.outstanding"),
                    value: formatCurrency(
                      stats.invoiceAnalytics?.outstandingAmount ?? 0,
                    ),
                  },
                ]}
              />
            </>
          ) : null}
        </div>

        {/* Trending charts */}
        {stats && stats.trends?.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard
              variant="sky"
              title={t("admin.analytics.ordersRevenueOverTime")}
              icon={BarChart3}
              description={t("admin.analytics.last12MonthsRevenue")}
            >
              <ResponsiveChartContainer>
                <AreaChart data={stats.trends}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value, name) => [
                      name === "revenue"
                        ? `$${Number(value ?? 0).toLocaleString()}`
                        : (value ?? 0),
                      name === "revenue"
                        ? t("admin.analytics.orderRevenueExclCancelledTooltip")
                        : t("admin.analytics.ordersTooltip"),
                    ]}
                    labelFormatter={(label) => label}
                  />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="orders"
                    stroke="hsl(var(--chart-1))"
                    fill="hsl(var(--chart-1) / 0.2)"
                    name="orders"
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--chart-2))"
                    fill="hsl(var(--chart-2) / 0.2)"
                    name="revenue"
                  />
                </AreaChart>
              </ResponsiveChartContainer>
            </ChartCard>
            <ChartCard
              variant="violet"
              title={t("admin.analytics.newProductsInvoices")}
              icon={TrendingUp}
              description={t("admin.analytics.last12Months")}
            >
              <ResponsiveChartContainer>
                <BarChart
                  data={stats.trends}
                  margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar
                    dataKey="products"
                    fill="hsl(var(--chart-1))"
                    name={t("products.products")}
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="invoices"
                    fill="hsl(var(--chart-2))"
                    name={t("invoices.invoices")}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveChartContainer>
            </ChartCard>
          </div>
        )}

        {/* Order Analytics section */}
        {stats && stats.orderAnalytics && (
          <div className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-sky-600" />
              {t("admin.analytics.orderAnalytics")}
            </h2>

            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatisticsCard
                title={t("admin.analytics.averageOrderValue")}
                value={formatCurrency(stats.orderAnalytics.averageOrderValue)}
                description={t("admin.analytics.perOrderInclCancelled")}
                icon={DollarSign}
                variant="emerald"
                badges={[
                  { label: t("orders.orders"), value: stats.counts?.orders },
                  {
                    label: t("admin.analytics.exclCancelled"),
                    value:
                      stats.counts?.orders -
                      (stats.orderAnalytics.statusDistribution.cancelled ?? 0),
                  },
                  {
                    label: t("admin.analytics.avgExcl"),
                    value:
                      stats.counts?.orders -
                        (stats.orderAnalytics.statusDistribution.cancelled ??
                          0) >
                      0
                        ? formatCurrency(
                            (stats.orderAnalytics
                              .totalRevenueExcludingCancelled ?? 0) /
                              (stats.counts?.orders -
                                (stats.orderAnalytics.statusDistribution
                                  .cancelled ?? 0)),
                          )
                        : formatCurrency(0),
                  },
                ]}
              />
              <StatisticsCard
                title={t("admin.analytics.totalOrderRevenue")}
                value={formatCurrency(
                  stats.orderAnalytics.totalRevenueExcludingCancelled ??
                    stats.orderAnalytics.totalRevenue,
                )}
                description={t("admin.analytics.profitsExclCancelled")}
                icon={DollarSign}
                variant="sky"
                badges={[
                  {
                    label: t("orders.paid"),
                    value: formatCurrency(
                      stats.orderAnalytics.paidOrderAmount ?? 0,
                    ),
                  },
                  {
                    label: t("admin.analytics.due"),
                    value: formatCurrency(
                      stats.invoiceAnalytics?.outstandingAmount ?? 0,
                    ),
                  },
                  {
                    label: t("admin.analytics.refund"),
                    value: formatCurrency(
                      stats.orderAnalytics.refundedAmount ?? 0,
                    ),
                  },
                  {
                    label: t("orders.pending"),
                    value: formatCurrency(
                      stats.orderAnalytics.pendingOrderAmount ?? 0,
                    ),
                  },
                  {
                    label: t("orders.cancelled"),
                    value: formatCurrency(
                      stats.orderAnalytics.cancelledOrderAmount ?? 0,
                    ),
                  },
                ]}
              />
              <StatisticsCard
                title={t("admin.analytics.completedOrders")}
                value={stats.orderAnalytics.statusDistribution.delivered}
                description={t("orders.delivered")}
                icon={ShoppingCart}
                variant="blue"
                badges={[
                  {
                    label: t("orders.pending"),
                    value: stats.orderAnalytics.statusDistribution.pending,
                  },
                  {
                    label: t("orders.confirmed"),
                    value: stats.orderAnalytics.statusDistribution.confirmed,
                  },
                  {
                    label: t("orders.shipping"),
                    value:
                      (stats.orderAnalytics.statusDistribution.processing ??
                        0) +
                      (stats.orderAnalytics.statusDistribution.shipped ?? 0),
                  },
                  {
                    label: t("orders.delivered"),
                    value: stats.orderAnalytics.statusDistribution.delivered,
                  },
                  {
                    label: t("orders.refunded"),
                    value: stats.orderAnalytics.refundedCount ?? 0,
                  },
                  {
                    label: t("orders.cancelled"),
                    value: stats.orderAnalytics.statusDistribution.cancelled,
                  },
                ]}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Order Status Distribution */}
              <ChartCard
                variant="sky"
                title={t("admin.analytics.orderStatusDistributionChart")}
                icon={BarChart3}
                description={t("admin.analytics.storeWideChart")}
              >
                <ResponsiveChartContainer>
                  <BarChart
                    data={[
                      {
                        status: t("orders.pending"),
                        count: stats.orderAnalytics.statusDistribution.pending,
                        fill: "hsl(45, 93%, 47%)",
                      },
                      {
                        status: t("orders.confirmed"),
                        count:
                          stats.orderAnalytics.statusDistribution.confirmed,
                        fill: "hsl(142, 76%, 36%)",
                      },
                      {
                        status: t("orders.processing"),
                        count:
                          stats.orderAnalytics.statusDistribution.processing,
                        fill: "hsl(217, 91%, 60%)",
                      },
                      {
                        status: t("orders.shipped"),
                        count: stats.orderAnalytics.statusDistribution.shipped,
                        fill: "hsl(199, 89%, 48%)",
                      },
                      {
                        status: t("orders.delivered"),
                        count:
                          stats.orderAnalytics.statusDistribution.delivered,
                        fill: "hsl(142, 71%, 45%)",
                      },
                      {
                        status: t("orders.cancelled"),
                        count:
                          stats.orderAnalytics.statusDistribution.cancelled,
                        fill: "hsl(0, 84%, 60%)",
                      },
                    ]}
                    layout="vertical"
                    margin={{ top: 8, right: 8, left: 70, bottom: 8 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-muted"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                    />
                    <YAxis
                      type="category"
                      dataKey="status"
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                      width={65}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value) => [value, t("admin.analytics.orders")]}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveChartContainer>
              </ChartCard>

              {/* Top Products by Orders — Orders = order lines; Revenue = sum of line subtotals (qty × price) */}
              <ChartCard
                variant="teal"
                title={t("admin.analytics.topProductsByOrdersChart")}
                icon={Package}
                description={t("admin.analytics.revenueSumOrderLines")}
              >
                {stats.orderAnalytics.topProducts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {t("admin.analytics.noOrderDataYetChart")}
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="py-2 pr-4">{t("admin.analytics.productChart")}</th>
                          <th
                            className="py-2 pr-4 text-right"
                            title="Number of order lines"
                          >
                            {t("admin.analytics.linesChart")}
                          </th>
                          <th className="py-2 pr-4 text-right">{t("admin.analytics.qtyChart")}</th>
                          <th className="py-2 text-right">{t("admin.analytics.revenueChart")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {stats.orderAnalytics.topProducts
                          .slice(0, 5)
                          .map((p) => (
                            <tr key={p.productId}>
                              <td
                                className="py-2 pr-4 font-medium truncate max-w-[150px]"
                                title={p.productName}
                              >
                                <Link
                                  href={`/admin/products/${p.productId}`}
                                  className="text-sky-600 dark:text-sky-400 hover:text-sky-500 dark:hover:text-sky-300"
                                >
                                  {p.productName}
                                </Link>
                              </td>
                              <td className="py-2 pr-4 text-right">
                                {p.orderCount}
                              </td>
                              <td className="py-2 pr-4 text-right">
                                {p.totalQuantity}
                              </td>
                              <td className="py-2 text-right">
                                ${p.totalRevenue.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </ChartCard>
            </div>
          </div>
        )}

        {/* Invoice Analytics section */}
        {stats && stats.invoiceAnalytics && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-amber-600" />
              {t("admin.analytics.invoiceAnalytics")}
            </h2>

            {/* Summary cards — 4 cards: 2 per row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 items-stretch">
              <StatisticsCard
                title={t("admin.analytics.avgInvoiceValue")}
                value={formatCurrency(
                  stats.invoiceAnalytics
                    .averageInvoiceValueExcludingCancelled ??
                    stats.invoiceAnalytics.averageInvoiceValue,
                )}
                description={t("admin.analytics.perInvoiceExclCancelled")}
                icon={DollarSign}
                variant="amber"
                badges={[
                  { label: t("invoices.invoicesLabel"), value: stats.counts?.invoices },
                  {
                    label: t("admin.analytics.exclCancelled"),
                    value:
                      stats.counts?.invoices -
                      (stats.invoiceAnalytics.statusDistribution.cancelled ??
                        0),
                  },
                  {
                    label: t("orders.cancelled"),
                    value:
                      stats.invoiceAnalytics.statusDistribution.cancelled ?? 0,
                  },
                  {
                    label: t("admin.analytics.totalExcl"),
                    value: formatCurrency(
                      stats.invoiceAnalytics.totalExcludingCancelled ?? 0,
                    ),
                  },
                ]}
              />
              <StatisticsCard
                title={t("admin.analytics.paidRevenueLabel")}
                value={formatCurrency(stats.invoiceAnalytics.paidRevenue)}
                description={t("admin.analytics.collected")}
                icon={DollarSign}
                variant="emerald"
                badges={[
                  {
                    label: t("orders.paid"),
                    value: stats.invoiceAnalytics.statusDistribution.paid ?? 0,
                  },
                  {
                    label: t("invoices.draft"),
                    value: stats.invoiceAnalytics.statusDistribution.draft ?? 0,
                  },
                  {
                    label: t("invoices.sent"),
                    value: stats.invoiceAnalytics.statusDistribution.sent ?? 0,
                  },
                  {
                    label: t("orders.cancelled"),
                    value:
                      stats.invoiceAnalytics.statusDistribution.cancelled ?? 0,
                  },
                ]}
              />
              <StatisticsCard
                title={t("admin.analytics.outstanding")}
                value={formatCurrency(stats.invoiceAnalytics.outstandingAmount)}
                description={t("admin.analytics.awaitingPayment")}
                icon={FileText}
                variant="sky"
                badges={[
                  {
                    label: t("invoices.draft"),
                    value: stats.invoiceAnalytics.statusDistribution.draft ?? 0,
                  },
                  {
                    label: t("invoices.sent"),
                    value: stats.invoiceAnalytics.statusDistribution.sent ?? 0,
                  },
                  {
                    label: t("invoices.overdue"),
                    value:
                      stats.invoiceAnalytics.statusDistribution.overdue ?? 0,
                  },
                  {
                    label: t("orders.cancelled"),
                    value:
                      stats.invoiceAnalytics.statusDistribution.cancelled ?? 0,
                  },
                ]}
              />
              <StatisticsCard
                title={t("invoices.overdue")}
                value={formatCurrency(stats.invoiceAnalytics.overdueAmount)}
                description={t("admin.analytics.pastDueDate")}
                icon={FileText}
                variant="rose"
                badges={[
                  {
                    label: t("invoices.overdue"),
                    value:
                      stats.invoiceAnalytics.statusDistribution.overdue ?? 0,
                  },
                  {
                    label: t("invoices.amount"),
                    value: formatCurrency(stats.invoiceAnalytics.overdueAmount),
                  },
                  {
                    label: t("orders.paid"),
                    value: stats.invoiceAnalytics.statusDistribution.paid ?? 0,
                  },
                  {
                    label: t("orders.cancelled"),
                    value:
                      stats.invoiceAnalytics.statusDistribution.cancelled ?? 0,
                  },
                ]}
              />
            </div>

            {/* Invoice Status Distribution */}
            <ChartCard
              variant="amber"
              title={t("admin.analytics.invoiceStatusDistributionChart")}
              icon={FileText}
              description={t("admin.analytics.storeWideChart")}
            >
              <ResponsiveChartContainer>
                <BarChart
                  data={[
                    {
                      status: t("invoices.draft"),
                      count: stats.invoiceAnalytics.statusDistribution.draft,
                      fill: "hsl(220, 9%, 46%)",
                    },
                    {
                      status: t("invoices.sent"),
                      count: stats.invoiceAnalytics.statusDistribution.sent,
                      fill: "hsl(217, 91%, 60%)",
                    },
                    {
                      status: t("invoices.paid"),
                      count: stats.invoiceAnalytics.statusDistribution.paid,
                      fill: "hsl(142, 71%, 45%)",
                    },
                    {
                      status: t("invoices.overdue"),
                      count: stats.invoiceAnalytics.statusDistribution.overdue,
                      fill: "hsl(0, 84%, 60%)",
                    },
                    {
                      status: t("invoices.cancelled"),
                      count:
                        stats.invoiceAnalytics.statusDistribution.cancelled,
                      fill: "hsl(0, 0%, 45%)",
                    },
                  ]}
                  layout="vertical"
                  margin={{ top: 8, right: 8, left: 70, bottom: 8 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    type="category"
                    dataKey="status"
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                    width={65}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value) => [value, t("invoices.invoices")]}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveChartContainer>
            </ChartCard>
          </div>
        )}

        {/* Warehouse Analytics section */}
        {stats &&
          stats.warehouseAnalytics &&
          (() => {
            const typeMap = new Map(
              (stats.warehouseAnalytics.typeDistribution ?? []).map((t) => [
                (t.type ?? "").toLowerCase().trim(),
                t.count,
              ]),
            );
            const knownTypes = ["main", "secondary", "storage", "hub", "store"];
            const othersCount = [...typeMap.entries()].reduce(
              (sum, [k, v]) => (knownTypes.includes(k) ? sum : sum + v),
              0,
            );
            const warehouseTypeBadges = [
              { key: "main", label: t("warehouses.main") },
              { key: "secondary", label: t("warehouses.secondary") },
              { key: "storage", label: t("warehouses.storage") },
              { key: "hub", label: t("insights.hub") },
              { key: "store", label: t("insights.store") },
              { key: "others", label: t("insights.others") },
            ].map(({ key, label }) => ({
              label,
              value: key === "others" ? othersCount : (typeMap.get(key) ?? 0),
            }));
            return (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Warehouse className="h-5 w-5 text-amber-500" />
                  {t("admin.analytics.warehouseAnalytics")}
                </h2>

                {/* Summary cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <StatisticsCard
                    title={t("admin.analytics.totalWarehouses")}
                    value={stats.warehouseAnalytics.totalWarehouses}
                    description={t("admin.analytics.allLocations")}
                    icon={Warehouse}
                    variant="teal"
                    badges={[
                      {
                        label: t("common.active"),
                        value: stats.warehouseAnalytics.activeWarehouses,
                      },
                      {
                        label: t("common.inactive"),
                        value: stats.warehouseAnalytics.inactiveWarehouses,
                      },
                    ]}
                  />
                  <StatisticsCard
                    title={t("admin.analytics.activeWarehouses")}
                    value={stats.warehouseAnalytics.activeWarehouses}
                    description={t("admin.analytics.operational")}
                    icon={Warehouse}
                    variant="emerald"
                    badges={warehouseTypeBadges}
                  />
                  <StatisticsCard
                    title={t("admin.analytics.inactiveWarehouses")}
                    value={stats.warehouseAnalytics.inactiveWarehouses}
                    description={t("admin.analytics.notInUse")}
                    icon={Warehouse}
                    variant="rose"
                    badges={warehouseTypeBadges}
                  />
                </div>

                {/* Warehouse Type Distribution */}
                {stats.warehouseAnalytics.typeDistribution.length > 0 && (
                  <ChartCard
                    variant="teal"
                    title={t("admin.analytics.warehousesByType")}
                    icon={Warehouse}
                    description={t("admin.analytics.storeWideChart")}
                  >
                    <ResponsiveChartContainer>
                      <BarChart
                        data={stats.warehouseAnalytics.typeDistribution.map(
                          (t, i) => ({
                            type: t.type,
                            count: t.count,
                            fill: `hsl(${(i * 60 + 35) % 360}, 70%, 50%)`,
                          }),
                        )}
                        layout="vertical"
                        margin={{ top: 8, right: 8, left: 90, bottom: 8 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          className="stroke-muted"
                          horizontal={false}
                        />
                        <XAxis
                          type="number"
                          tick={{ fontSize: 12 }}
                          className="text-muted-foreground"
                        />
                        <YAxis
                          type="category"
                          dataKey="type"
                          tick={{ fontSize: 12 }}
                          className="text-muted-foreground"
                          width={85}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                          formatter={(value) => [value, t("nav.warehouses")]}
                        />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveChartContainer>
                  </ChartCard>
                )}
              </div>
            );
          })()}

        {/* Log summary: recent activity — 4 cards: 2 per row */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 items-stretch">
            <ChartCard
              variant="sky"
              title={t("admin.analytics.recentOrders")}
              icon={ShoppingCart}
              description={t("admin.analytics.latest5")}
            >
              <div className="flex flex-col gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-fit -mt-1"
                  asChild
                >
                  <Link href="/admin/orders" className="gap-1">
                    {t("common.view")} <ArrowRight className="h-3 w-3" />
                  </Link>
                </Button>
                {stats.recent.orders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("admin.analytics.noOrdersYet")}</p>
                ) : (
                  <ul className="space-y-2">
                    {stats.recent.orders.slice(0, 5).map((o) => (
                      <li key={o.id}>
                        <Link
                          href={`/admin/orders/${o.id}`}
                          className="text-sm font-medium text-sky-600 dark:text-sky-400 hover:text-sky-500 dark:hover:text-sky-300 flex items-center justify-between gap-2"
                        >
                          <span className="truncate">{o.orderNumber}</span>
                          <span className="text-muted-foreground shrink-0">
                            ${o.total.toLocaleString()}
                          </span>
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(o.createdAt), "MMM d, HH:mm")} ·{" "}
                          {o.status}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </ChartCard>
            <ChartCard
              variant="rose"
              title={t("admin.analytics.recentTickets")}
              icon={MessageSquare}
              description={t("admin.analytics.latest5")}
            >
              <div className="flex flex-col gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-fit -mt-1"
                  asChild
                >
                  <Link href="/admin/support-tickets" className="gap-1">
                    {t("common.view")} <ArrowRight className="h-3 w-3" />
                  </Link>
                </Button>
                {stats.recent.tickets.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t("admin.analytics.noTicketsYet")}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {stats.recent.tickets.slice(0, 5).map((t) => (
                      <li key={t.id}>
                        <Link
                          href={`/admin/support-tickets/${t.id}`}
                          className="text-sm font-medium text-sky-600 dark:text-sky-400 hover:text-sky-500 dark:hover:text-sky-300 block truncate"
                        >
                          {t.subject}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(t.createdAt), "MMM d, HH:mm")} ·{" "}
                          {t.status}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </ChartCard>
            <ChartCard
              variant="orange"
              title={t("admin.analytics.recentReviews")}
              icon={Star}
              description={t("admin.analytics.latest5")}
            >
              <div className="flex flex-col gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-fit -mt-1"
                  asChild
                >
                  <Link href="/admin/product-reviews" className="gap-1">
                    {t("common.view")} <ArrowRight className="h-3 w-3" />
                  </Link>
                </Button>
                {stats.recent.reviews.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t("admin.analytics.noReviewsYet")}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {stats.recent.reviews.slice(0, 5).map((r) => (
                      <li key={r.id}>
                        <Link
                          href={`/admin/product-reviews/${r.id}`}
                          className="text-sm font-medium text-sky-600 dark:text-sky-400 hover:text-sky-500 dark:hover:text-sky-300 block truncate"
                        >
                          {r.productName} · {r.rating}★
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(r.createdAt), "MMM d, HH:mm")} ·{" "}
                          {r.status}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </ChartCard>
            <ChartCard
              variant="blue"
              title={t("admin.analytics.recentImports")}
              icon={BarChart3}
              description={t("admin.analytics.latest5")}
            >
              <div className="flex flex-col gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-fit -mt-1"
                  asChild
                >
                  <Link href="/admin/activity-history" className="gap-1">
                    {t("common.view")} <ArrowRight className="h-3 w-3" />
                  </Link>
                </Button>
                {stats.recent.imports.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t("admin.analytics.noImportsYet")}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {stats.recent.imports.slice(0, 5).map((im) => (
                      <li key={im.id}>
                        <Link
                          href={`/admin/activity-history/${im.id}`}
                          className="text-sm font-medium text-sky-600 dark:text-sky-400 hover:text-sky-500 dark:hover:text-sky-300 block truncate"
                        >
                          {im.importType} · {im.fileName}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(im.createdAt), "MMM d, HH:mm")} ·{" "}
                          {im.successRows} {t("admin.analytics.ok")}, {im.failedRows} {t("admin.analytics.failed")}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </ChartCard>
          </div>
        )}

        {/* AI insights */}
        <ChartCard
          variant="violet"
          title={t("admin.analytics.aiPoweredInsights")}
          icon={Sparkles}
          description={t("admin.analytics.generateRecommendations")}
        >
          <div className="space-y-4">
            <Button
              onClick={handleGenerateAiInsights}
              disabled={aiLoading || !stats}
              className="shrink-0 gap-2"
            >
              {aiLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate insights
                </>
              )}
            </Button>
            {aiUnavailable && (
              <p className="text-sm text-muted-foreground">
                AI insights require OPENROUTER_API_KEY. Set it in .env to
                enable.
              </p>
            )}
            {aiText && (
              <div className="rounded-lg border border-border/50 bg-muted/30 p-4 text-sm whitespace-pre-wrap text-foreground">
                {aiText}
              </div>
            )}
            {!aiUnavailable && !aiText && !aiLoading && (
              <p className="text-sm text-muted-foreground">
                Click &quot;Generate insights&quot; to get AI recommendations
                from your dashboard data.
              </p>
            )}
          </div>
        </ChartCard>
      </div>

      {/* Demand Forecasting Section */}
      <ChartCard
        variant="emerald"
        title={t("admin.analytics.demandForecastingPredictions")}
        icon={TrendingUp}
        description={t("admin.analytics.storeWide")}
      >
        <ForecastingSection />
      </ChartCard>
    </PageContentWrapper>
  );
}
