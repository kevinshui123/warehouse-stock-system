import { AlertDialogWrapper } from "@/components/dialogs";
import { useProductStore } from "@/stores";
import { useDeleteProduct } from "@/hooks/queries";
import { logger } from "@/lib/logger";
import { useLanguage } from "@/contexts/language-context";

export function DeleteDialog() {
  const { t } = useLanguage();
  // Keep UI state in Zustand (openDialog, selectedProduct)
  const {
    openDialog,
    setOpenDialog,
    setSelectedProduct,
    selectedProduct,
  } = useProductStore();
  
  // Use TanStack Query mutation for delete operation
  const deleteProductMutation = useDeleteProduct();

  async function deleteProductFx() {
    if (selectedProduct) {
      try {
        await deleteProductMutation.mutateAsync(selectedProduct.id);
        // Close dialog and clear selection on success
        // Toast is handled by the mutation hook
        setOpenDialog(false);
        setSelectedProduct(null);
      } catch (error) {
        // Error toast is handled by the mutation hook
        // Just log for debugging
        logger.error("Delete error:", error);
      }
    }
  }

  return (
    <AlertDialogWrapper
      open={openDialog}
      onOpenChange={(open: boolean) => {
        setOpenDialog(open);
        if (!open) {
          setSelectedProduct(null);
        }
      }}
      title={t("products.confirmDelete")}
      description={t("toast.operationFailed")}
      actionLabel={t("common.delete")}
      actionLoadingLabel={t("common.loading")}
      isLoading={deleteProductMutation.isPending}
      onAction={deleteProductFx}
      onCancel={() => {
        setSelectedProduct(null);
      }}
    />
  );
}
