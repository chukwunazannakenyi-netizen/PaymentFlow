import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  getFeeStructures,
  createFeeStructure,
  deleteFeeStructure,
  updateFeeStructure,
  restoreFeeStructure,
  getStudents,
  getSchool,
} from "../services/api";
import { getErrorMessage } from "../utils/errorMessages";
import { DEFAULT_CLASS_OPTIONS, loadSchoolClassOptions } from "../utils/classOptions";
import { IconAlertTriangle, IconCheck, IconDollarSign } from "../components/Icons";
import PageHero from "../components/PageHero";

const EMPTY_FORM = {
  className: "",
  feeAmount: "",
  academicYear: new Date().getUTCFullYear().toString(),
  description: "",
};

// ── Delete confirmation modal ─────────────────────────────────────────────────

function DeleteConfirmModal({ feeStructure, studentCount, onConfirm, onCancel }) {
  const { t } = useTranslation();
  const cancelRef = useRef(null);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    cancelRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="del-modal-title"
      aria-describedby="del-modal-desc"
      style={overlayStyle}
    >
      <div style={modalStyle}>
        <h2 id="del-modal-title" style={{ marginTop: 0, fontSize: "1.1rem" }}>
          {t("fees.deleteTitle")}
        </h2>
        <p id="del-modal-desc" style={{ color: "var(--text)", lineHeight: 1.5 }}>
          {t("fees.deleteIntro")}{" "}
          <strong>{feeStructure.className}</strong>.
          {studentCount > 0 && (
            <>
              {" "}{t("fees.deleteAffects")}{" "}
              <strong>{t("fees.studentCount", { count: studentCount })}</strong>.
            </>
          )}{" "}
          This will not affect existing payments.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "1.5rem" }}>
          <button ref={cancelRef} onClick={onCancel} className="btn btn-ghost">
            {t("actions.cancel")}
          </button>
          <button onClick={onConfirm} className="btn btn-danger">
            {t("actions.delete")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Edit fee modal ────────────────────────────────────────────────────────────

function EditFeeModal({ fee, classOptions, onSave, onCancel }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    className:    fee.className,
    feeAmount:    String(fee.feeAmount),
    academicYear: fee.academicYear || "",
    description:  fee.description  || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);
  const cancelRef = useRef(null);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    cancelRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    const feeAmount = parseFloat(form.feeAmount);
    if (!form.className) {
      setError(t("fees.classRequired") || "Class is required.");
      return;
    }
    if (!form.feeAmount || isNaN(feeAmount) || feeAmount <= 0) {
      setError(t("fees.amountPositive") || "Fee amount must be a positive number.");
      return;
    }

    setSaving(true);
    try {
      await onSave(fee.className, {
        className: form.className,
        feeAmount,
        ...(form.academicYear && { academicYear: form.academicYear }),
        ...(form.description.trim() && { description: form.description.trim() }),
      });
    } catch (err) {
      setError(
        err.response?.data?.error || t("fees.failedToCreate") || "Failed to save changes."
      );
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-modal-title"
      style={overlayStyle}
    >
      <div style={{ ...modalStyle, maxWidth: 480 }}>
        <h2 id="edit-modal-title" style={{ marginTop: 0, fontSize: "1.1rem" }}>
          Edit Fee Structure
        </h2>

        {error && (
          <div role="alert" className="alert alert-danger" style={{ marginBottom: "1rem" }}>
            <IconAlertTriangle size={14} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="edit-className">
              {t("fees.classLabel")} *
            </label>
            <select
              id="edit-className"
              className="form-input"
              value={form.className}
              onChange={(e) => setForm((p) => ({ ...p, className: e.target.value }))}
              disabled={saving}
              required
            >
              <option value="">{t("fees.selectClass")}</option>
              {classOptions.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="edit-feeAmount">
              {t("fees.feeAmountLabel")} *
            </label>
            <input
              id="edit-feeAmount"
              className="form-input"
              type="number"
              min="0.0000001"
              step="any"
              value={form.feeAmount}
              onChange={(e) => setForm((p) => ({ ...p, feeAmount: e.target.value }))}
              disabled={saving}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="edit-academicYear">
              {t("fees.academicYearLabel")}
            </label>
            <input
              id="edit-academicYear"
              className="form-input"
              type="text"
              value={form.academicYear}
              onChange={(e) => setForm((p) => ({ ...p, academicYear: e.target.value }))}
              disabled={saving}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="edit-description">
              {t("fees.descriptionLabel")}
            </label>
            <input
              id="edit-description"
              className="form-input"
              type="text"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              disabled={saving}
            />
          </div>

          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "1.5rem" }}>
            <button
              ref={cancelRef}
              type="button"
              onClick={onCancel}
              className="btn btn-ghost"
              disabled={saving}
            >
              {t("actions.cancel")}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
              aria-busy={saving}
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function FeesPage() {
  const { t } = useTranslation();

  const [fees, setFees]               = useState([]);
  const [archivedFees, setArchivedFees] = useState([]);
  const [activeTab, setActiveTab]     = useState("active"); // "active" | "archived"
  const [pagination, setPagination]   = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [classOptions, setClassOptions] = useState(DEFAULT_CLASS_OPTIONS);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);

  // Create-form state
  const [form, setForm]               = useState(EMPTY_FORM);
  const [creating, setCreating]       = useState(false);
  const [createError, setCreateError] = useState(null);
  const [createSuccess, setCreateSuccess] = useState(false);

  // Delete state
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleteError, setDeleteError]     = useState(null);

  // Edit state
  const [editingFee, setEditingFee]   = useState(null);
  const [editError, setEditError]     = useState(null);

  // Restore state
  const [restoreError, setRestoreError] = useState(null);

  const successRef = useRef(null);

  useEffect(() => {
    loadFees();
    loadSchoolClassOptions(getSchool, setClassOptions);
  }, []);

  useEffect(() => {
    if (createSuccess) {
      successRef.current?.focus();
      const timer = setTimeout(() => setCreateSuccess(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [createSuccess]);

  function loadFees(page = 1) {
    setLoading(true);
    setError(null);
    getFeeStructures({ page, limit: pagination.limit })
      .then(({ data }) => {
        const all = Array.isArray(data.data || data) ? (data.data || data) : [];
        // Split into active and archived based on deletedAt presence
        setFees(all.filter((f) => !f.deletedAt));
        setArchivedFees(all.filter((f) => !!f.deletedAt));
        if (data.pagination) setPagination(data.pagination);
      })
      .catch(() =>
        setError(t("fees.failedToLoad") || "Could not load fee structures.")
      )
      .finally(() => setLoading(false));
  }

  // ── Create handlers ───────────────────────────────────────────────────────

  function handleFormChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setCreateError(null);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setCreateError(null);
    setCreateSuccess(false);

    const feeAmount = parseFloat(form.feeAmount);
    if (!form.className) {
      setCreateError(t("fees.classRequired") || "Class is required.");
      return;
    }
    if (!form.feeAmount || isNaN(feeAmount) || feeAmount <= 0) {
      setCreateError(t("fees.amountPositive") || "Fee amount must be a positive number.");
      return;
    }

    setCreating(true);
    try {
      const payload = {
        className: form.className,
        feeAmount,
        ...(form.academicYear && { academicYear: form.academicYear }),
        ...(form.description.trim() && { description: form.description.trim() }),
      };
      const { data: newFee } = await createFeeStructure(payload);
      // Optimistic: add to active list immediately
      setFees((prev) => [...prev, newFee]);
      setForm(EMPTY_FORM);
      setCreateSuccess(true);
      loadFees(1);
    } catch (err) {
      setCreateError(
        getErrorMessage(err.response?.data?.code, err.response?.data?.error) ||
          err.response?.data?.errors?.[0] ||
          t("fees.failedToCreate") || "Failed to create fee structure."
      );
    } finally {
      setCreating(false);
    }
  }

  // ── Delete handlers ───────────────────────────────────────────────────────

  async function handleDeleteClick(fee) {
    setDeleteError(null);
    let studentCount = 0;
    try {
      const { data } = await getStudents(1, 1, { className: fee.className });
      studentCount = data.total || 0;
    } catch {
      // non-fatal
    }
    setPendingDelete({ fee, studentCount });
  }

  async function handleConfirmDelete() {
    const { fee } = pendingDelete;
    // Optimistic: move to archived list immediately
    const prevFees     = fees;
    const prevArchived = archivedFees;
    setFees((prev) => prev.filter((f) => f.className !== fee.className));
    setArchivedFees((prev) => [
      ...prev,
      { ...fee, deletedAt: new Date().toISOString() },
    ]);
    setPendingDelete(null);
    try {
      await deleteFeeStructure(fee.className);
      loadFees(pagination.page);
    } catch (err) {
      // Revert on failure
      setFees(prevFees);
      setArchivedFees(prevArchived);
      setDeleteError(
        getErrorMessage(err.response?.data?.code, err.response?.data?.error) ||
          t("fees.failedToDelete") || "Failed to delete fee structure."
      );
    }
  }

  // ── Edit handlers ─────────────────────────────────────────────────────────

  async function handleEditSave(originalClassName, payload) {
    setEditError(null);
    // Optimistic: update active list immediately
    const prevFees = fees;
    setFees((prev) =>
      prev.map((f) =>
        f.className === originalClassName ? { ...f, ...payload } : f
      )
    );
    setEditingFee(null);
    try {
      await updateFeeStructure(originalClassName, payload);
      loadFees(pagination.page);
    } catch (err) {
      // Revert on failure
      setFees(prevFees);
      setEditingFee(null);
      setEditError(
        err.response?.data?.error || t("fees.failedToCreate") || "Failed to save changes."
      );
      throw err; // let modal surface inline error
    }
  }

  // ── Restore handlers ──────────────────────────────────────────────────────

  async function handleRestore(fee) {
    setRestoreError(null);
    // Optimistic: move from archived to active immediately
    const prevFees     = fees;
    const prevArchived = archivedFees;
    const restored = { ...fee, deletedAt: null };
    setArchivedFees((prev) => prev.filter((f) => f.className !== fee.className));
    setFees((prev) => [...prev, restored]);
    try {
      await restoreFeeStructure(fee.className);
      loadFees(pagination.page);
    } catch (err) {
      // Revert on failure
      setFees(prevFees);
      setArchivedFees(prevArchived);
      setRestoreError(
        err.response?.data?.error || "Failed to restore fee structure."
      );
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <PageHero
        eyebrow={t("fees.eyebrow")}
        title={t("fees.title")}
        subtitle={t("fees.subtitle")}
      />

      <div className="page-wrap">

        {/* ── Create form ── */}
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <div className="card-header">
            <div
              className="card-title"
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <IconDollarSign size={16} />
              {t("fees.createTitle")}
            </div>
          </div>
          <div className="card-body">
            {createSuccess && (
              <div
                ref={successRef}
                tabIndex="-1"
                role="status"
                aria-live="polite"
                className="alert alert-success"
                style={{ marginBottom: "1rem" }}
              >
                <IconCheck size={15} />
                <span>{t("fees.createSuccess") || "Fee structure created successfully."}</span>
              </div>
            )}
            {createError && (
              <div role="alert" className="alert alert-danger" style={{ marginBottom: "1rem" }}>
                <IconAlertTriangle size={15} />
                <span>{createError}</span>
              </div>
            )}

            <form
              onSubmit={handleCreate}
              aria-label={t("fees.createFormAria")}
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                gap: "1rem",
                alignItems: "end",
              }}
            >
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="fee-className">
                  {t("fees.classLabel")}{" "}
                  <span aria-hidden="true" style={{ color: "var(--danger)" }}>*</span>
                </label>
                <select
                  id="fee-className"
                  name="className"
                  value={form.className}
                  onChange={handleFormChange}
                  required
                  disabled={creating}
                  className="form-input"
                  aria-required="true"
                >
                  <option value="">{t("fees.selectClass")}</option>
                  {classOptions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="fee-feeAmount">
                  {t("fees.feeAmountLabel")}{" "}
                  <span aria-hidden="true" style={{ color: "var(--danger)" }}>*</span>
                </label>
                <input
                  id="fee-feeAmount"
                  name="feeAmount"
                  type="number"
                  min="0.0000001"
                  step="any"
                  placeholder={t("fees.feePlaceholder")}
                  value={form.feeAmount}
                  onChange={handleFormChange}
                  required
                  disabled={creating}
                  className="form-input"
                  aria-required="true"
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="fee-academicYear">
                  {t("fees.academicYearLabel")}
                </label>
                <input
                  id="fee-academicYear"
                  name="academicYear"
                  type="text"
                  placeholder={new Date().getUTCFullYear().toString()}
                  value={form.academicYear}
                  onChange={handleFormChange}
                  disabled={creating}
                  className="form-input"
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="fee-description">
                  {t("fees.descriptionLabel")}
                </label>
                <input
                  id="fee-description"
                  name="description"
                  type="text"
                  placeholder={t("fees.descriptionPlaceholder")}
                  value={form.description}
                  onChange={handleFormChange}
                  disabled={creating}
                  className="form-input"
                />
              </div>

              <div style={{ display: "flex", alignItems: "flex-end" }}>
                <button
                  type="submit"
                  disabled={creating}
                  className="btn btn-primary"
                  style={{ width: "100%" }}
                  aria-busy={creating}
                >
                  {creating ? t("fees.creating") : t("fees.create")}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* ── Alerts ── */}
        {error && (
          <div role="alert" className="alert alert-danger" style={{ marginBottom: "1rem" }}>
            <IconAlertTriangle size={15} />
            <span>{error}</span>
          </div>
        )}
        {deleteError && (
          <div role="alert" className="alert alert-danger" style={{ marginBottom: "1rem" }}>
            <IconAlertTriangle size={15} />
            <span>{deleteError}</span>
          </div>
        )}
        {editError && (
          <div role="alert" className="alert alert-danger" style={{ marginBottom: "1rem" }}>
            <IconAlertTriangle size={15} />
            <span>{editError}</span>
          </div>
        )}
        {restoreError && (
          <div role="alert" className="alert alert-danger" style={{ marginBottom: "1rem" }}>
            <IconAlertTriangle size={15} />
            <span>{restoreError}</span>
          </div>
        )}

        {/* ── Fee table with Active / Archived tabs ── */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                className={`btn btn-sm ${activeTab === "active" ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setActiveTab("active")}
                aria-pressed={activeTab === "active"}
              >
                Active {!loading && `(${fees.length})`}
              </button>
              <button
                className={`btn btn-sm ${activeTab === "archived" ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setActiveTab("archived")}
                aria-pressed={activeTab === "archived"}
              >
                Archived {!loading && `(${archivedFees.length})`}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="card-body">
              <p aria-busy="true" style={{ color: "var(--text-muted)" }}>
                {t("fees.loading")}
              </p>
            </div>
          ) : activeTab === "active" ? (
            fees.length === 0 ? (
              <div className="card-body">
                <p style={{ color: "var(--text-muted)" }}>
                  {t("fees.empty") || "No fee structures found."}
                </p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="data-table" aria-label={t("fees.tableAria")}>
                  <thead>
                    <tr>
                      <th scope="col">{t("fees.colClass")}</th>
                      <th scope="col">{t("fees.colFeeAmount")}</th>
                      <th scope="col">{t("fees.colAcademicYear")}</th>
                      <th scope="col">{t("fees.colDescription")}</th>
                      <th scope="col">
                        <span className="sr-only">{t("fees.colActions")}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {fees.map((fee) => (
                      <tr key={fee.className}>
                        <td className="col-mono">{fee.className}</td>
                        <td>
                          <span style={{ fontVariantNumeric: "tabular-nums" }}>
                            {fee.feeAmount}
                          </span>
                          <span
                            style={{
                              marginLeft: "0.3rem",
                              fontSize: "0.72rem",
                              color: "var(--text-muted)",
                              fontWeight: 600,
                            }}
                          >
                            XLM
                          </span>
                        </td>
                        <td>{fee.academicYear || "—"}</td>
                        <td style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
                          {fee.description || "—"}
                        </td>
                        <td style={{ display: "flex", gap: "0.5rem" }}>
                          <button
                            onClick={() => setEditingFee(fee)}
                            className="btn btn-sm btn-ghost"
                            aria-label={`Edit fee structure for ${fee.className}`}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteClick(fee)}
                            className="btn btn-sm btn-ghost"
                            style={{ color: "var(--danger, #dc2626)" }}
                            aria-label={t("fees.deleteForClass", { className: fee.className })}
                          >
                            {t("actions.delete")}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            /* Archived tab */
            archivedFees.length === 0 ? (
              <div className="card-body">
                <p style={{ color: "var(--text-muted)" }}>No archived fee structures.</p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="data-table" aria-label="Archived fee structures">
                  <thead>
                    <tr>
                      <th scope="col">{t("fees.colClass")}</th>
                      <th scope="col">{t("fees.colFeeAmount")}</th>
                      <th scope="col">{t("fees.colAcademicYear")}</th>
                      <th scope="col">{t("fees.colDescription")}</th>
                      <th scope="col">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {archivedFees.map((fee) => (
                      <tr key={fee.className} style={{ opacity: 0.65 }}>
                        <td className="col-mono">{fee.className}</td>
                        <td>
                          <span style={{ fontVariantNumeric: "tabular-nums" }}>
                            {fee.feeAmount}
                          </span>
                          <span
                            style={{
                              marginLeft: "0.3rem",
                              fontSize: "0.72rem",
                              color: "var(--text-muted)",
                              fontWeight: 600,
                            }}
                          >
                            XLM
                          </span>
                        </td>
                        <td>{fee.academicYear || "—"}</td>
                        <td style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
                          {fee.description || "—"}
                        </td>
                        <td>
                          <button
                            onClick={() => handleRestore(fee)}
                            className="btn btn-sm btn-ghost"
                            style={{ color: "var(--grad-brand, #059669)" }}
                            aria-label={`Restore fee structure for ${fee.className}`}
                          >
                            Restore
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      {pendingDelete && (
        <DeleteConfirmModal
          feeStructure={pendingDelete.fee}
          studentCount={pendingDelete.studentCount}
          onConfirm={handleConfirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      {editingFee && (
        <EditFeeModal
          fee={editingFee}
          classOptions={classOptions}
          onSave={handleEditSave}
          onCancel={() => setEditingFee(null)}
        />
      )}
    </>
  );
}

// ── Shared modal styles ───────────────────────────────────────────────────────

const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const modalStyle = {
  background: "var(--card-bg)",
  borderRadius: 10,
  padding: "1.5rem",
  maxWidth: 420,
  width: "90%",
  boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
};
