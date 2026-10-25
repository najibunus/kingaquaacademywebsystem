import { getCurrentStaffName, loadSalesFormData } from "@/lib/sales/store";
import SalesInvoiceForm from "../SalesInvoiceForm";

export default async function NewSalesInvoicePage() {
  const [{ customers, products, categories }, staffName] = await Promise.all([
    loadSalesFormData(),
    getCurrentStaffName(),
  ]);

  return (
    <SalesInvoiceForm
      initialCustomers={customers}
      initialProducts={products}
      initialCategories={categories}
      staffName={staffName}
    />
  );
}
