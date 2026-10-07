// The controlled category list, for Managers (FR-006, FR-027): add, rename and deactivate. There is no
// delete: a category referenced by a request must not be deleted (FR-027), and a deactivated one simply
// stops being offered at submission while existing requests keep it.

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "../api.js";
import { Page } from "../components/Page.jsx";

function Rename({ category, api, onDone, onCancel }) {
  const [name, setName] = useState(category.name);
  const [error, setError] = useState(null);
  const id = `rename-${category.id}`;
  const input = useRef(null);
  useEffect(() => input.current?.focus(), []);
  const save = async (event) => {
    event.preventDefault();
    try {
      await api.renameCategory(category.id, name);
      onDone(`Renamed to ${name.trim()}.`);
    } catch (e) {
      setError(e instanceof ApiError && e.errors ? Object.values(e.errors).join(" ") : e.message);
    }
  };
  return (
    <form onSubmit={save} className="inline-form inline-form--tight" noValidate>
      <div className="field">
        <label htmlFor={id}>New name for {category.name}</label>
        <input id={id} type="text" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={error ? "true" : undefined} aria-describedby={error ? `${id}-error` : undefined} ref={input} />
        {error && (
          <p id={`${id}-error`} className="error-message">
            {error}
          </p>
        )}
      </div>
      <button type="submit" className="button button--secondary">
        Save
      </button>
      <button type="button" className="link-button" onClick={onCancel}>
        Cancel
      </button>
    </form>
  );
}

export function Categories({ api }) {
  const [categories, setCategories] = useState(null);
  const [error, setError] = useState(null);
  const [newName, setNewName] = useState("");
  const [addError, setAddError] = useState(null);
  const [renaming, setRenaming] = useState(null);
  const [confirming, setConfirming] = useState(null);
  const [notice, setNotice] = useState(null);

  const load = useCallback(() => {
    api.allCategories().then((d) => setCategories(d.categories), (e) => setError(e.message));
  }, [api]);
  useEffect(load, [load]);

  const done = (text) => {
    setNotice(text);
    setRenaming(null);
    setConfirming(null);
    load();
  };

  const add = async (event) => {
    event.preventDefault();
    setAddError(null);
    try {
      await api.addCategory(newName);
      setNewName("");
      done(`${newName.trim()} added. It is offered at submission now.`);
    } catch (e) {
      setAddError(e instanceof ApiError && e.errors ? Object.values(e.errors).join(" ") : e.message);
    }
  };

  const deactivate = async (c) => {
    try {
      await api.deactivateCategory(c.id);
      done(`${c.name} is deactivated. It is no longer offered at submission; its ${c.requestCount} request${c.requestCount === 1 ? " keeps" : "s keep"} it.`);
    } catch (e) {
      setNotice(e.message);
      setConfirming(null);
    }
  };

  return (
    <Page title="Categories">
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      {!categories && !error && <p className="loading">Loading categories…</p>}
      {categories && (
        <div className="table-wrap">
          <table>
            <caption className="visually-hidden">Request categories</caption>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Status</th>
                <th scope="col">Requests</th>
                <th scope="col">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id}>
                  <td>{renaming === c.id ? <Rename category={c} api={api} onDone={done} onCancel={() => setRenaming(null)} /> : c.name}</td>
                  <td>{c.active ? "Active" : "Deactivated"}</td>
                  <td>{c.requestCount}</td>
                  <td className="row-actions">
                    {renaming !== c.id && confirming !== c.id && (
                      <>
                        <button type="button" className="link-button" onClick={() => setRenaming(c.id)}>
                          Rename<span className="visually-hidden"> {c.name}</span>
                        </button>
                        {c.active && (
                          <button type="button" className="link-button" onClick={() => setConfirming(c.id)}>
                            Deactivate<span className="visually-hidden"> {c.name}</span>
                          </button>
                        )}
                      </>
                    )}
                    {confirming === c.id && (
                      <span role="group" aria-label={`Confirm deactivating ${c.name}`}>
                        Stop offering {c.name}?{" "}
                        <button type="button" className="link-button link-button--danger" onClick={() => deactivate(c)}>
                          Yes, deactivate
                        </button>{" "}
                        <button type="button" className="link-button" onClick={() => setConfirming(null)}>
                          Cancel
                        </button>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2>Add a category</h2>
      <form className="inline-form" onSubmit={add} noValidate>
        <div className="field">
          <label htmlFor="new-category">Name</label>
          <input id="new-category" type="text" value={newName} onChange={(e) => setNewName(e.target.value)} aria-invalid={addError ? "true" : undefined} aria-describedby={addError ? "new-category-error" : undefined} />
          {addError && (
            <p id="new-category-error" className="error-message">
              {addError}
            </p>
          )}
        </div>
        <button type="submit" className="button button--secondary">
          Add category
        </button>
      </form>
    </Page>
  );
}
