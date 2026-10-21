import { supabase, supabaseConfigured, money, escapeHTML } from "./supabase.js";

/* ============================================================ */
/* STATE                                                          */
/* ============================================================ */
const notice = document.querySelector(".notice");
const productTable = document.getElementById("productTable");
const orderTable = document.getElementById("orderTable");

let products = [];
let orders = [];
let editingProductId = null;
let currentAdminUser = null;

/* ============================================================ */
/* HELPERS                                                        */
/* ============================================================ */
function setNotice(text, isError = false) {
  if (!notice) return;
  notice.textContent = text;
  notice.style.color = isError ? "#ffb5b5" : "#e6d4a9";
  notice.style.borderLeftColor = isError ? "#c62828" : "#c9a24a";
}

function cell(row, value) {
  const td = document.createElement("td");
  td.textContent = String(value ?? "—");
  row.appendChild(td);
  return td;
}

function updateStats() {
  const productCount = products.length;
  const orderCount = orders.length;

  const revenue = orders
    .filter(o => o.status !== "Cancelled")
    .reduce((sum, o) => sum + Number(o.total || 0), 0);

  const pending = orders.filter(o => o.status === "Pending").length;

  document.getElementById("productCount").textContent = productCount;
  document.getElementById("orderCount").textContent = orderCount;
  document.getElementById("revenue").textContent = money(revenue);
  document.getElementById("pendingCount").textContent = pending;

  // Inline counts
  const inlineCount = document.getElementById("productCountInline");
  if (inlineCount) inlineCount.textContent = productCount;
}

/* ============================================================ */
/* PRODUCT FORM ELEMENTS                                          */
/* ============================================================ */
const form = document.getElementById("productForm");
const productImageFile = document.getElementById("productImageFile");
const productImageUrl = document.getElementById("productImage");
const productImagePreview = document.getElementById("productImagePreview");

const productVideoFile = document.getElementById("productVideoFile");
const productVideoPreview = document.getElementById("productVideoPreview");

const formHeading = document.querySelector("#products .panel-heading h2");
const submitProductButton = form?.querySelector('button[type="submit"]');

function clearImagePreviews() {
  productImagePreview?.replaceChildren();
}

function clearVideoPreview() {
  productVideoPreview?.replaceChildren();
}

function showVideoPreview(url) {
  clearVideoPreview();
  if (!url || !productVideoPreview) return;

  const video = document.createElement("video");
  video.src = url;
  video.controls = true;
  video.preload = "metadata";
  video.style.width = "100%";
  video.style.maxWidth = "350px";
  video.style.marginTop = "10px";
  video.style.borderRadius = "6px";
  video.style.border = "1px solid #2a2a2a";

  productVideoPreview.appendChild(video);
}

function resetProductForm() {
  editingProductId = null;
  form.reset();
  clearImagePreviews();
  clearVideoPreview();

  // Reset stock and tag if fields exist
  const stockEl = document.getElementById("productStock");
  if (stockEl) stockEl.value = "0";
  const tagEl = document.getElementById("productTag");
  if (tagEl) tagEl.value = "";

  if (submitProductButton) submitProductButton.textContent = "Save Product";
  if (formHeading) formHeading.textContent = "Product Management";

  const addButton = document.getElementById("addProductBtn");
  if (addButton) addButton.textContent = "+ Add Product";
}

/* ============================================================ */
/* ADD / CANCEL PRODUCT                                           */
/* ============================================================ */
document.getElementById("addProductBtn")?.addEventListener("click", () => {
  if (!form.hidden && editingProductId === null) {
    form.hidden = true;
    resetProductForm();
    return;
  }

  resetProductForm();
  form.hidden = false;
  if (formHeading) formHeading.textContent = "Add Product";
  document.getElementById("addProductBtn").textContent = "Close Form";
  form.scrollIntoView({ behavior: "smooth", block: "start" });
});

document.getElementById("cancelProductBtn")?.addEventListener("click", () => {
  resetProductForm();
  form.hidden = true;
});

/* ============================================================ */
/* RENDER PRODUCTS                                                */
/* ============================================================ */
function renderProducts() {
  if (!productTable) return;
  productTable.replaceChildren();

  if (!products.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 6;
    td.className = "empty";
    td.textContent = "No products yet. Click '+ Add Product' to create one.";
    tr.appendChild(td);
    productTable.appendChild(tr);
    return;
  }

  products.forEach(p => {
    const tr = document.createElement("tr");

    // Name + thumbnail
    const nameCell = cell(tr, "");
    const thumb = (Array.isArray(p.image_urls) ? p.image_urls[0] : null) || p.image_url;

    if (thumb) {
      const img = document.createElement("img");
      img.className = "product-thumb";
      img.src = thumb;
      img.alt = p.name || "Product";
      img.loading = "lazy";
      nameCell.appendChild(img);
    }

    nameCell.appendChild(document.createTextNode(p.name || ""));

    if (p.video_url) {
      const videoLabel = document.createElement("span");
      videoLabel.textContent = " 🎬 Video";
      videoLabel.style.display = "block";
      videoLabel.style.fontSize = "11px";
      videoLabel.style.color = "#c9a24a";
      nameCell.appendChild(videoLabel);
    }

    // Category
    cell(tr, p.category);

    // Price
    const priceCell = cell(tr, "");
    const priceNow = document.createElement("strong");
    priceNow.textContent = money(p.price);
    priceCell.appendChild(priceNow);

    const oldPrice = Number(p.old_price || 0);
    if (oldPrice > Number(p.price)) {
      const delPrice = document.createElement("del");
      delPrice.style.marginLeft = "8px";
      delPrice.style.color = "#666";
      delPrice.textContent = money(oldPrice);
      priceCell.appendChild(delPrice);
    }

    // Stock
    const stockNum = Number(p.stock);
    const stockCell = cell(tr, "");
    if (Number.isFinite(stockNum)) {
      const stockSpan = document.createElement("span");
      stockSpan.textContent = stockNum;
      stockSpan.style.fontWeight = "600";
      if (stockNum <= 0) stockSpan.style.color = "#ef5350";
      else if (stockNum <= 5) stockSpan.style.color = "#ffb84d";
      else stockSpan.style.color = "#66bb6a";
      stockCell.appendChild(stockSpan);
    } else {
      stockCell.textContent = "—";
    }

    // Tag
    const tagCell = cell(tr, "");
    if (p.tag) {
      const tagBadge = document.createElement("span");
      tagBadge.className = "status new";
      tagBadge.textContent = p.tag;
      tagCell.appendChild(tagBadge);
    } else {
      tagCell.textContent = "—";
    }

    // Actions
    const actionCell = cell(tr, "");
    const actions = document.createElement("div");
    actions.className = "actions";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "btn secondary small";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => editProduct(p.id));

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "btn danger small";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => deleteProduct(p.id, p));

    actions.append(editBtn, deleteBtn);
    actionCell.appendChild(actions);
    productTable.appendChild(tr);
  });
}

/* ============================================================ */
/* EDIT PRODUCT                                                   */
/* ============================================================ */
function editProduct(id) {
  const product = products.find(p => String(p.id) === String(id));

  if (!product) {
    setNotice("Product not found. Please refresh and try again.", true);
    return;
  }

  editingProductId = product.id;
  form.reset();
  clearImagePreviews();
  clearVideoPreview();

  document.getElementById("productName").value = product.name || "";
  document.getElementById("productPrice").value = product.price ?? "";
  document.getElementById("productOldPrice").value = product.old_price ?? "";
  document.getElementById("productDescription").value = product.description || "";
  document.getElementById("productCategory").value = product.category || "Men";

  // Stock
  const stockEl = document.getElementById("productStock");
  if (stockEl) stockEl.value = product.stock ?? 0;

  // Tag
  const tagEl = document.getElementById("productTag");
  if (tagEl) tagEl.value = product.tag || "";

  // Image URL
  if (productImageUrl) {
    productImageUrl.value =
      product.image_url ||
      (Array.isArray(product.image_urls) ? product.image_urls[0] : "") ||
      "";
  }

  // Show existing video
  showVideoPreview(product.video_url || "");

  if (formHeading) formHeading.textContent = "Edit Product";
  if (submitProductButton) submitProductButton.textContent = "Update Product";
  form.hidden = false;
  form.scrollIntoView({ behavior: "smooth", block: "start" });

  setNotice("Editing product. Upload new images/video if you want to replace them.");
}

/* ============================================================ */
/* IMAGE UPLOAD                                                   */
/* ============================================================ */
function selectedImageFiles() {
  return Array.from(productImageFile?.files || []);
}

productImageFile?.addEventListener("change", () => {
  const files = selectedImageFiles();
  clearImagePreviews();

  if (files.length > 6) {
    setNotice("Maximum 6 images allowed.", true);
    productImageFile.value = "";
    return;
  }

  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      setNotice("Only image files allowed.", true);
      productImageFile.value = "";
      clearImagePreviews();
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setNotice("Each image must be under 5 MB.", true);
      productImageFile.value = "";
      clearImagePreviews();
      return;
    }
  }

  files.forEach(file => {
    const img = document.createElement("img");
    img.alt = file.name;
    img.src = URL.createObjectURL(file);
    productImagePreview.appendChild(img);
  });

  setNotice(files.length ? `${files.length} image(s) selected.` : "");
});

async function uploadProductImages() {
  const files = selectedImageFiles();
  const typedUrl = productImageUrl.value.trim();

  if (!files.length) return typedUrl ? [typedUrl] : [];
  if (files.length > 6) throw new Error("Maximum 6 images allowed.");

  const urls = [];
  const uploadedPaths = [];

  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) throw new Error("Only image files allowed.");
      if (file.size > 5 * 1024 * 1024) throw new Error(`Image ${i + 1} exceeds 5 MB.`);

      const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
      const filePath = `products/${crypto.randomUUID()}-${safeName}`;

      const { error } = await supabase.storage
        .from("product-images")
        .upload(filePath, file, {
          contentType: file.type,
          cacheControl: "3600",
          upsert: false
        });

      if (error) throw new Error("Image upload failed: " + error.message);

      const publicUrl = supabase.storage.from("product-images").getPublicUrl(filePath).data.publicUrl;
      urls.push(publicUrl);
      uploadedPaths.push(filePath);
    }

    return urls;
  } catch (err) {
    // Cleanup partially uploaded files
    for (const path of uploadedPaths) {
      await supabase.storage.from("product-images").remove([path]).catch(() => {});
    }
    throw err;
  }
}

/* ============================================================ */
/* VIDEO UPLOAD                                                   */
/* ============================================================ */
function selectedVideoFile() {
  return productVideoFile?.files?.[0] || null;
}

productVideoFile?.addEventListener("change", () => {
  clearVideoPreview();
  const file = selectedVideoFile();

  if (!file) return;

  const allowedTypes = ["video/mp4", "video/webm", "video/ogg"];

  if (!allowedTypes.includes(file.type)) {
    productVideoFile.value = "";
    setNotice("Only MP4, WebM, or OGG videos allowed.", true);
    return;
  }

  if (file.size > 50 * 1024 * 1024) {
    productVideoFile.value = "";
    setNotice("Video must be under 50 MB.", true);
    return;
  }

  const video = document.createElement("video");
  video.src = URL.createObjectURL(file);
  video.controls = true;
  video.preload = "metadata";
  video.style.width = "100%";
  video.style.maxWidth = "350px";
  video.style.marginTop = "10px";
  video.style.borderRadius = "6px";
  video.style.border = "1px solid #2a2a2a";

  productVideoPreview.appendChild(video);
  setNotice("Video selected: " + file.name);
});

async function uploadProductVideo() {
  const file = selectedVideoFile();
  if (!file) return null;

  const allowedTypes = ["video/mp4", "video/webm", "video/ogg"];
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Only MP4, WebM, or OGG videos allowed.");
  }
  if (file.size > 50 * 1024 * 1024) {
    throw new Error("Video must be under 50 MB.");
  }

  const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
  const filePath = `videos/${crypto.randomUUID()}-${safeName}`;

  // Try product-videos bucket, fallback to product-images
  const buckets = ["product-videos", "product-images"];
  let lastError = null;

  for (const bucket of buckets) {
    const { error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false
      });

    if (!error) {
      return supabase.storage.from(bucket).getPublicUrl(filePath).data.publicUrl;
    }
    lastError = error;
  }

  throw new Error("Video upload failed: " + (lastError?.message || "Unknown error"));
}

/* ============================================================ */
/* SUBMIT PRODUCT                                                 */
/* ============================================================ */
form?.addEventListener("submit", async event => {
  event.preventDefault();

  if (!supabaseConfigured) {
    setNotice("Supabase config missing. Check supabase.js.", true);
    return;
  }

  submitProductButton.disabled = true;
  const originalText = submitProductButton.textContent;
  submitProductButton.textContent = "Saving...";

  try {
    const wasEditing = editingProductId !== null;
    const currentProduct = wasEditing
      ? products.find(p => String(p.id) === String(editingProductId))
      : null;

    if (wasEditing && !currentProduct) {
      throw new Error("Product not found. Please reload and try again.");
    }

    const typedImageUrl = productImageUrl.value.trim();
    let imageUrls;

    if (selectedImageFiles().length) {
      imageUrls = await uploadProductImages();
    } else if (
      currentProduct &&
      typedImageUrl === (
        currentProduct.image_url ||
        (Array.isArray(currentProduct.image_urls) ? currentProduct.image_urls[0] : "") ||
        ""
      )
    ) {
      imageUrls = Array.isArray(currentProduct.image_urls) && currentProduct.image_urls.length
        ? currentProduct.image_urls
        : currentProduct.image_url
          ? [currentProduct.image_url]
          : [];
    } else {
      imageUrls = typedImageUrl ? [typedImageUrl] : [];
    }

    // Preserve existing video unless new one selected
    let videoUrl = currentProduct?.video_url || null;
    if (selectedVideoFile()) {
      videoUrl = await uploadProductVideo();
    }

    const stockEl = document.getElementById("productStock");
    const tagEl = document.getElementById("productTag");

    const payload = {
      name: document.getElementById("productName").value.trim(),
      price: Number(document.getElementById("productPrice").value),
      old_price: Number(document.getElementById("productOldPrice").value) || null,
      category: document.getElementById("productCategory").value,
      description: document.getElementById("productDescription").value.trim() || null,
      image_url: imageUrls[0] || null,
      image_urls: imageUrls,
      video_url: videoUrl,
      stock: stockEl ? Number(stockEl.value) || 0 : 0,
      tag: tagEl ? tagEl.value.trim() || null : null,
      active: currentProduct?.active ?? true
    };

    if (!payload.name || !Number.isFinite(payload.price) || payload.price <= 0) {
      setNotice("Valid product name and selling price required.", true);
      return;
    }

    if (payload.old_price !== null && payload.old_price <= payload.price) {
      setNotice("Original price must be greater than selling price.", true);
      return;
    }

    const saveQuery = wasEditing
      ? supabase.from("products").update(payload).eq("id", editingProductId)
      : supabase.from("products").insert(payload);

    const { error } = await saveQuery;

    if (error) {
      setNotice(
        (wasEditing ? "Product update failed: " : "Product save failed: ") + error.message,
        true
      );
      return;
    }

    resetProductForm();
    form.hidden = true;
    await loadData();
    setNotice(wasEditing ? "Product updated successfully." : "Product created successfully.");
  } catch (error) {
    console.error(error);
    setNotice(error.message || "Product/image/video save failed.", true);
  } finally {
    submitProductButton.disabled = false;
    submitProductButton.textContent = originalText;
  }
});

/* ============================================================ */
/* DELETE PRODUCT                                                 */
/* ============================================================ */
async function deleteProduct(id, product) {
  if (!confirm(`Delete "${product?.name || "this product"}"?\n\nThis will also remove all images and video from storage.`)) {
    return;
  }

  try {
    // Delete images from storage
    const imageUrls = Array.isArray(product?.image_urls) && product.image_urls.length
      ? product.image_urls
      : product?.image_url
        ? [product.image_url]
        : [];

    const imagePaths = imageUrls
      .map(url => extractStoragePath(url, "product-images"))
      .filter(Boolean);

    if (imagePaths.length) {
      await supabase.storage.from("product-images").remove(imagePaths).catch(e => {
        console.warn("Image cleanup failed:", e);
      });
    }

    // Delete video from storage
    if (product?.video_url) {
      const videoPath = extractStoragePath(product.video_url, "product-videos")
        || extractStoragePath(product.video_url, "product-images");
      if (videoPath) {
        await supabase.storage.from("product-videos").remove([videoPath]).catch(() => {});
        await supabase.storage.from("product-images").remove([videoPath]).catch(() => {});
      }
    }

    // Delete DB row
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) throw error;

    await loadData();
    setNotice("Product and files deleted.");
  } catch (error) {
    setNotice("Delete failed: " + error.message, true);
  }
}

function extractStoragePath(publicUrl, bucket) {
  if (!publicUrl || typeof publicUrl !== "string") return null;
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(publicUrl.slice(idx + marker.length));
}

/* ============================================================ */
/* RENDER ORDERS                                                  */
/* ============================================================ */
function renderOrders() {
  if (!orderTable) return;
  orderTable.replaceChildren();

  if (!orders.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 6;
    td.className = "empty";
    td.textContent = "No orders yet.";
    tr.appendChild(td);
    orderTable.appendChild(tr);
    return;
  }

  orders.forEach(o => {
    const tr = document.createElement("tr");

    cell(tr, o.order_number ?? o.id ?? "—");
    cell(tr, o.customer_name || "—");
    cell(tr, money(o.total));

    cell(tr,
      o.payment_method === "COD"
        ? "COD"
        : (o.payment_method || "—")
    );

    // Status dropdown
    const statusCell = cell(tr, "");
    const select = document.createElement("select");
    select.style.padding = "6px";
    select.style.background = "#0d0d0d";
    select.style.color = "#fff";
    select.style.border = "1px solid #2a2a2a";
    select.style.borderRadius = "4px";
    select.style.fontSize = "12px";

    ["Pending", "Confirmed", "Processing", "Shipped", "Delivered", "Cancelled"].forEach(status => {
      const option = document.createElement("option");
      option.value = status;
      option.textContent = status;
      option.selected = o.status === status;
      select.appendChild(option);
    });

    select.addEventListener("change", () => updateOrder(o.id, select.value));
    statusCell.appendChild(select);

    // Actions
    const actionCell = cell(tr, "");
    const actions = document.createElement("div");
    actions.className = "actions";

    const viewBtn = document.createElement("button");
    viewBtn.type = "button";
    viewBtn.className = "btn secondary small";
    viewBtn.textContent = "View";
    viewBtn.addEventListener("click", () => viewOrder(o));

    const receiptBtn = document.createElement("button");
    receiptBtn.type = "button";
    receiptBtn.className = "btn secondary small";
    receiptBtn.textContent = "Receipt";
    receiptBtn.addEventListener("click", () => printOrderReceipt(o));

    actions.append(viewBtn, receiptBtn);
    actionCell.appendChild(actions);
    orderTable.appendChild(tr);
  });
}

async function updateOrder(id, status) {
  const { error } = await supabase
    .from("orders")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    setNotice("Order status update failed: " + error.message, true);
    return;
  }

  await loadData();
  setNotice(`Order status updated to "${status}".`);
}

function viewOrder(order) {
  const items = Array.isArray(order.items) ? order.items : [];
  const itemList = items.map(i =>
    `• ${i.name} × ${i.quantity} — ${money(Number(i.price) * Number(i.quantity))}`
  ).join("\n") || "No items";

  const address = [order.address, order.city, order.state, order.pincode]
    .filter(Boolean).join(", ");

  alert(
`Order #${order.order_number || order.id}
Customer: ${order.customer_name || "—"}
Phone: ${order.phone || "—"}
Email: ${order.email || "—"}
Address: ${address}

Payment: ${order.payment_method || "COD"} / ${order.payment_status || "Pending"}
Status: ${order.status || "Pending"}
Total: ${money(order.total)}

Items:
${itemList}`
  );
}

/* ============================================================ */
/* ADMIN CHECK                                                    */
/* ============================================================ */
async function requireAdmin() {
  if (!supabaseConfigured) {
    setNotice("Supabase is not configured. Check supabase.js.", true);
    return false;
  }

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    location.href = "login.html";
    return false;
  }

  // Check admin_users table (not profiles)
  const { data: adminRecord, error: adminError } = await supabase
    .from("admin_users")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminError || !adminRecord) {
    setNotice(
      "Access denied: Your account does not have admin privileges. Contact the site owner.",
      true
    );
    document.querySelectorAll("button, input, select").forEach(el => el.disabled = true);
    return false;
  }

  currentAdminUser = user;
  return true;
}

/* ============================================================ */
/* LOAD DATA                                                      */
/* ============================================================ */
async function loadData() {
  if (!await requireAdmin()) return;

  try {
    const [productResult, orderResult] = await Promise.all([
      supabase.from("products").select("*").order("created_at", { ascending: false }),
      supabase.from("orders").select("*").order("created_at", { ascending: false })
    ]);

    if (productResult.error || orderResult.error) {
      setNotice(
        "Database error: " + (productResult.error?.message || orderResult.error?.message),
        true
      );
      return;
    }

    products = productResult.data || [];
    orders = orderResult.data || [];

    renderProducts();
    renderOrders();
    updateStats();

    setNotice(`Connected to Supabase. Loaded ${products.length} products and ${orders.length} orders.`);
  } catch (err) {
    console.error(err);
    setNotice("Failed to load data: " + err.message, true);
  }
}

/* ============================================================ */
/* NAVIGATION                                                     */
/* ============================================================ */
document.querySelectorAll(".nav-btn").forEach(button => {
  button.addEventListener("click", () => openSection(button.dataset.section));
});

document.querySelectorAll("[data-go]").forEach(button => {
  button.addEventListener("click", () => openSection(button.dataset.go));
});

function openSection(id) {
  document.querySelectorAll(".section").forEach(section => {
    section.classList.toggle("active", section.id === id);
  });

  document.querySelectorAll(".nav-btn").forEach(button => {
    button.classList.toggle("active", button.dataset.section === id);
  });

  const titles = {
    dashboard: ["Dashboard", "WATCH.T store management"],
    products: ["Products", "Add, edit, and manage your catalog"],
    orders: ["Orders", "Track and update customer orders"],
    sales: ["Sales", "Revenue and sales analytics"]
  };

  const [title, subtitle] = titles[id] || ["Dashboard", ""];
  document.getElementById("pageTitle").textContent = title;
  const subEl = document.getElementById("pageSubtitle");
  if (subEl) subEl.textContent = subtitle;
}

/* ============================================================ */
/* PRINT RECEIPT                                                  */
/* ============================================================ */
function receiptEscape(value) {
  return String(value ?? "—").replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));
}

function printOrderReceipt(order) {
  const receiptWindow = window.open("", "_blank", "width=800,height=700");
  if (!receiptWindow) {
    setNotice("Popup blocked. Allow pop-ups for receipts.", true);
    return;
  }

  const orderId = order.order_number ?? order.id ?? "—";
  const address = [order.address, order.city, order.state, order.pincode]
    .filter(Boolean).join(", ");

  const items = Array.isArray(order.items) ? order.items : [];
  const itemsHTML = items.length
    ? `<table>
        <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
        <tbody>
          ${items.map(i => `
            <tr>
              <td>${receiptEscape(i.name)}</td>
              <td>${Number(i.quantity)}</td>
              <td>${receiptEscape(money(i.price))}</td>
              <td>${receiptEscape(money(Number(i.price) * Number(i.quantity)))}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>`
    : "<p>No items</p>";

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>WATCH.T Receipt - ${receiptEscape(orderId)}</title>
<style>
  body{font-family:Arial,sans-serif;padding:30px;color:#222;max-width:700px;margin:auto}
  h1{text-align:center;color:#c9a24a;margin-bottom:4px}
  h2{text-align:center;color:#666;font-weight:normal;font-size:16px;margin-top:0}
  table{width:100%;border-collapse:collapse;margin:16px 0}
  th,td{padding:10px;border-bottom:1px solid #ddd;text-align:left}
  th{background:#f5f5f5;font-size:13px;text-transform:uppercase}
  .total{font-size:22px;font-weight:bold;color:#c9a24a;text-align:right;margin-top:20px}
  .meta{background:#f9f9f9;padding:16px;border-radius:6px;margin:16px 0}
  .meta p{margin:6px 0;font-size:14px}
  button{padding:12px 24px;cursor:pointer;background:#c9a24a;color:#111;border:none;font-weight:bold;margin-bottom:20px}
  @media print { button{display:none} }
</style>
</head>
<body>
<button onclick="window.print()">🖨 Print Receipt</button>
<h1>WATCH.T</h1>
<h2>Order Receipt</h2>
<div class="meta">
  <p><b>Order #:</b> ${receiptEscape(orderId)}</p>
  <p><b>Date:</b> ${receiptEscape(new Date(order.created_at || Date.now()).toLocaleString("en-IN"))}</p>
  <p><b>Customer:</b> ${receiptEscape(order.customer_name || "—")}</p>
  <p><b>Phone:</b> ${receiptEscape(order.phone || "—")}</p>
  <p><b>Email:</b> ${receiptEscape(order.email || "—")}</p>
  <p><b>Address:</b> ${receiptEscape(address || "—")}</p>
  <p><b>Payment:</b> ${receiptEscape(order.payment_method || "COD")}</p>
  <p><b>Status:</b> ${receiptEscape(order.status || "Pending")}</p>
</div>
${itemsHTML}
<p class="total">Total: ${receiptEscape(money(order.total))}</p>
<p style="text-align:center;color:#888;font-size:12px;margin-top:40px">Thank you for shopping with WATCH.T</p>
</body>
</html>`;

  receiptWindow.document.open();
  receiptWindow.document.write(html);
  receiptWindow.document.close();
  receiptWindow.focus();
}

/* ============================================================ */
/* SIGN OUT                                                       */
/* ============================================================ */
document.getElementById("signOutBtn")?.addEventListener("click", async () => {
  if (supabaseConfigured) await supabase.auth.signOut();
  location.href = "login.html";
});

/* ============================================================ */
/* SEARCH                                                         */
/* ============================================================ */
document.getElementById("productSearch")?.addEventListener("input", (e) => {
  const q = e.target.value.toLowerCase();
  const filtered = products.filter(p =>
    `${p.name} ${p.category}`.toLowerCase().includes(q)
  );
  renderFilteredProducts(filtered);
});

function renderFilteredProducts(list) {
  if (!productTable) return;
  const original = products;
  products = list;
  renderProducts();
  products = original;
}

/* ============================================================ */
/* START                                                          */
/* ============================================================ */
loadData();