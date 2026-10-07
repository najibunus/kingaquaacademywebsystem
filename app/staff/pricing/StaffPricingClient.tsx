"use client";

import { useState, useTransition } from "react";
import styles from "./pricing.module.css";
import { updatePricingAction, addPricingAction, deletePricingAction } from "@/lib/actions/pricing";

export default function StaffPricingClient({ pricingData, classes, locations }: { pricingData: any[], classes: any[], locations: any[] }) {
  const [isPending, startTransition] = useTransition();
  const [pricingList, setPricingList] = useState(pricingData);
  const [message, setMessage] = useState("");

  // Modal state
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // Add form
  const [addClassId, setAddClassId] = useState("");
  const [addLocationId, setAddLocationId] = useState("");
  const [addPrice, setAddPrice] = useState("");
  const [addTier, setAddTier] = useState("Standard");
  const [addBilling, setAddBilling] = useState("per_student");

  // Edit form
  const [editPrice, setEditPrice] = useState("");
  const [editTier, setEditTier] = useState("");
  const [editBilling, setEditBilling] = useState("");

  // Location tabs
  const [activeTab, setActiveTab] = useState("All");
  const locationTabs = ["All", ...Array.from(new Set(pricingList.map((p: any) => p.locations?.name).filter(Boolean)))];
  const filteredPricing = activeTab === "All"
    ? pricingList
    : pricingList.filter((p: any) => p.locations?.name === activeTab);

  const cleanClassName = (rawName: string) => {
    if (!rawName) return "";
    let c = rawName.replace(/\s*\([^)]*\)\s*$/, "").replace(/^(UTHM|Pura Kencana|Pontian)\s+/i, "").trim();
    if (c === c.toUpperCase() && c.length > 1) c = c.charAt(0) + c.slice(1).toLowerCase();
    return c;
  };

  const notify = (msg: string) => { setMessage(msg); setTimeout(() => setMessage(""), 3500); };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await addPricingAction(addClassId, addLocationId, parseFloat(addPrice), addTier, addBilling);
      if (res.success && res.data) {
        const cName = classes.find((c: any) => c.id === addClassId)?.name;
        const lName = locations.find((l: any) => l.id === addLocationId)?.name;
        setPricingList([{ ...res.data, classes: { name: cName }, locations: { name: lName } }, ...pricingList]);
        setShowAdd(false); setAddPrice(""); setAddClassId(""); setAddLocationId("");
        notify("Pricing added!");
      } else notify("Error: " + res.error);
    });
  };

  const openEdit = (p: any) => {
    setSelectedItem(p); setEditPrice(p.price.toString()); setEditTier(p.tier); setEditBilling(p.billing_type);
    setShowEdit(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    startTransition(async () => {
      const res = await updatePricingAction(selectedItem.id, parseFloat(editPrice), editTier, editBilling);
      if (res.success) {
        setPricingList(pricingList.map((p: any) => p.id === selectedItem.id ? { ...p, price: parseFloat(editPrice), tier: editTier, billing_type: editBilling } : p));
        setShowEdit(false); setSelectedItem(null); notify("Pricing updated!");
      } else notify("Error: " + res.error);
    });
  };

  const openDelete = (p: any) => { setSelectedItem(p); setShowDelete(true); };

  const confirmDelete = () => {
    if (!selectedItem) return;
    startTransition(async () => {
      const res = await deletePricingAction(selectedItem.id);
      if (res.success) {
        setPricingList(pricingList.filter((p: any) => p.id !== selectedItem.id));
        setShowDelete(false); setSelectedItem(null); notify("Pricing deleted.");
      } else notify("Error: " + res.error);
    });
  };

  return (
    <div className={`animate-fade-in-up ${styles.page}`}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Class Pricing</h1>
          <p className={styles.subtitle}>View and manage pricing matrices organized by venue.</p>
        </div>
        <button className={styles.addBtn} onClick={() => setShowAdd(true)}>
          + Add New Pricing
        </button>
      </div>

      {/* Toast */}
      {message && <div className={styles.toast}>{message}</div>}

      {/* Location Tabs */}
      <div className={styles.tabs}>
        {locationTabs.map(tab => (
          <button
            key={tab}
            className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Class</th>
              {activeTab === "All" && <th>Location</th>}
              <th>Tier</th>
              <th>Billing</th>
              <th className={styles.thRight}>Price</th>
              <th className={styles.thCenter}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPricing.length === 0 ? (
              <tr className={styles.emptyRow}>
                <td colSpan={activeTab === "All" ? 6 : 5}>No pricing entries for this location.</td>
              </tr>
            ) : filteredPricing.map((p: any) => (
              <tr key={p.id}>
                <td className={styles.className}>{cleanClassName(p.classes?.name)}</td>
                {activeTab === "All" && (
                  <td><span className={styles.locationBadge}>{p.locations?.name}</span></td>
                )}
                <td><span className={styles.tierPill}>{p.tier}</span></td>
                <td>{p.billing_type === "per_student" ? "Per Student" : "Per Group"}</td>
                <td className={styles.tdRight}>
                  <span className={styles.price}>RM {p.price}</span>
                </td>
                <td className={styles.tdCenter}>
                  <div className={styles.actions}>
                    <button className={styles.btnEdit} onClick={() => openEdit(p)}>Edit</button>
                    <button className={styles.btnDelete} onClick={() => openDelete(p)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ─── ADD MODAL ─── */}
      {showAdd && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <h2 className={styles.modalTitle}>Add New Pricing</h2>
            <p className={styles.modalSub}>Fill in the details below to create a new pricing entry.</p>
            <form onSubmit={handleAdd}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Class</label>
                <select required className={styles.formSelect} value={addClassId} onChange={e => setAddClassId(e.target.value)}>
                  <option value="">-- Select Class --</option>
                  {classes.map((c: any) => <option key={c.id} value={c.id}>{cleanClassName(c.name)}</option>)}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Location</label>
                <select required className={styles.formSelect} value={addLocationId} onChange={e => setAddLocationId(e.target.value)}>
                  <option value="">-- Select Location --</option>
                  {locations.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Tier Name</label>
                <input required type="text" className={styles.formInput} placeholder="e.g. Standard, Staff/Students" value={addTier} onChange={e => setAddTier(e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Price (RM)</label>
                <input required type="number" min="0" className={styles.formInput} placeholder="e.g. 150" value={addPrice} onChange={e => setAddPrice(e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Billing Type</label>
                <select className={styles.formSelect} value={addBilling} onChange={e => setAddBilling(e.target.value)}>
                  <option value="per_student">Per Student</option>
                  <option value="per_group">Per Group</option>
                </select>
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.btnCancel} onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" disabled={isPending} className={styles.btnSave}>{isPending ? "Saving..." : "Save Pricing"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── EDIT MODAL ─── */}
      {showEdit && selectedItem && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <h2 className={styles.modalTitle}>Edit Pricing</h2>
            <p className={styles.modalSub}>{cleanClassName(selectedItem.classes?.name)} &mdash; {selectedItem.locations?.name}</p>
            <form onSubmit={handleSaveEdit}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Tier Name</label>
                <input required type="text" className={styles.formInput} value={editTier} onChange={e => setEditTier(e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Price (RM)</label>
                <input required type="number" min="0" className={styles.formInput} value={editPrice} onChange={e => setEditPrice(e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Billing Type</label>
                <select className={styles.formSelect} value={editBilling} onChange={e => setEditBilling(e.target.value)}>
                  <option value="per_student">Per Student</option>
                  <option value="per_group">Per Group</option>
                </select>
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.btnCancel} onClick={() => { setShowEdit(false); setSelectedItem(null); }}>Cancel</button>
                <button type="submit" disabled={isPending} className={styles.btnSave}>{isPending ? "Saving..." : "Update Pricing"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── DELETE MODAL ─── */}
      {showDelete && selectedItem && (
        <div className={styles.overlay}>
          <div className={styles.deleteModal}>
            <div className={styles.deleteIcon}>
              <svg width="26" height="26" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className={styles.deleteTitle}>Delete Pricing?</h2>
            <p className={styles.deleteMessage}>
              This will permanently remove the <strong>{selectedItem.tier}</strong> pricing for <strong>{cleanClassName(selectedItem.classes?.name)}</strong> at <strong>{selectedItem.locations?.name}</strong>. This cannot be undone.
            </p>
            <div className={styles.deleteActions}>
              <button className={styles.btnKeep} onClick={() => { setShowDelete(false); setSelectedItem(null); }}>Keep It</button>
              <button className={styles.btnConfirmDelete} disabled={isPending} onClick={confirmDelete}>{isPending ? "Deleting..." : "Yes, Delete"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
