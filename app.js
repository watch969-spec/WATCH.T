// ============================================================
// WATCH.T — Main App Logic
// Handles missing columns gracefully
// ============================================================

import { supabase, supabaseConfigured, money, escapeHTML } from "./supabase.js";

/* ============ STATE ============ */
let products = [];
let selectedCategory = "All";
let selectedPriceRange = "all";
let cart = readCart();

function readCart() {
  try {
    const value = JSON.parse(localStorage.getItem("allWatchCart") || "[]");
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}

function saveCart() {
  localStorage.setItem("allWatchCart", JSON.stringify(cart));
}

/* ============ DOM REFS ============ */
const productGrid  = document.getElementById("productGrid");
const emptyMessage = document.getElementById("emptyMessage");
const searchInput  = document.getElementById("searchInput");
const cartPanel    = document.getElementById("cartPanel");
const overlay      = document.getElementById("overlay");

/* ============================================================
   RENDER PRODUCTS
   ============================================================ */
function renderProducts() {
  if (!productGrid) return;

  const query = (searchInput?.value || "").trim().toLowerCase();

  const filtered = products.filter(p => {
    const catMatch = selectedCategory === "All" || p.category === selectedCategory;
    if (!catMatch) return false;

    const price = Number(p.price) || 0;
    let priceMatch = true;
    if (selectedPriceRange === "under-999") priceMatch = price < 1000;
    else if (selectedPriceRange === "1000-1999") priceMatch = price >= 1000 && price < 2000;
    else if (selectedPriceRange === "2000-2999") priceMatch = price >= 2000 && price < 3000;
    else if (selectedPriceRange === "3000-plus") priceMatch = price >= 3000;

    const searchMatch = `${p.name} ${p.category}`.toLowerCase().includes(query);
    return priceMatch && searchMatch;
  });

  /* Empty state */
  if (!filtered.length) {
    productGrid.innerHTML = "";
    if (emptyMessage) {
      emptyMessage.hidden = false;
      if (products.length === 0) {
        emptyMessage.innerHTML = `
          <div style="text-align:center; padding: 60px 20px;">
            <div style="font-size: 48px; opacity: .3; margin-bottom: 16px;">📦</div>
            <h3 style="font-family: 'Cormorant Garamond', serif; font-size: 24px; margin-bottom: 8px; color: #111;">No products available yet</h3>
            <p style="color: #888; font-size: 14px;">Check back soon — new watches are on the way.</p>
          </div>
        `;
      } else {
        emptyMessage.textContent = "No products match your filters.";
      }
    }
    return;
  }

  if (emptyMessage) emptyMessage.hidden = true;

  /* Render cards */
  productGrid.innerHTML = filtered.map(p => {
    const oldPrice = Number(p.old_price ?? p.oldPrice ?? 0);
    const price = Number(p.price) || 0;
    const discount = oldPrice > price ? Math.round((1 - price / oldPrice) * 100) : 0;
    const inStock = (p.stock === undefined || p.stock === null || Number(p.stock) > 0);

    // Safe image fallback
    const imageUrl = p.image_url ||
      p.image ||
      (Array.isArray(p.image_urls) && p.image_urls.length ? p.image_urls[0] : "") ||
      "";

    // Safe video check
    const hasVideo = !!(p.video_url ||
      (Array.isArray(p.video_urls) && p.video_urls.length > 0));

    return `
    <article class="product-card">
      ${p.tag ? `<span class="product-tag">${escapeHTML(p.tag)}</span>` : ""}
      ${hasVideo ? `<span class="product-tag video-tag" style="top: auto; bottom: 12px; background: #111; color: #c9a24a;">🎬 Video</span>` : ""}
      <a href="product.html?id=${encodeURIComponent(p.id)}" aria-label="View ${escapeHTML(p.name)}">
        <div class="product-image">
          <img src="${escapeHTML(imageUrl)}" alt="${escapeHTML(p.name)}" loading="lazy">
        </div>
      </a>
      <div class="product-info">
        <div class="product-category">${escapeHTML(p.category || "")}</div>
        <h3><a href="product.html?id=${encodeURIComponent(p.id)}">${escapeHTML(p.name)}</a></h3>
        <div class="product-price">
          ${money(price)}
          ${discount ? `<del>${money(oldPrice)}</del><span class="discount-badge">${discount}% OFF</span>` : ""}
        </div>
        <button class="add-btn" data-add="${escapeHTML(p.id)}" ${!inStock ? "disabled" : ""}>
          ${inStock ? "ADD TO CART +" : "SOLD OUT"}
        </button>
      </div>
    </article>`;
  }).join("");
}

/* ============================================================
   TOAST
   ============================================================ */
function showToast(text) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = text;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2200);
}

/* ============================================================
   CART
   ============================================================ */
function addToCart(id) {
  const p = products.find(item => String(item.id) === String(id));
  if (!p) return;

  if (p.stock !== undefined && p.stock !== null && Number(p.stock) <= 0) {
    showToast("This product is sold out");
    return;
  }

  const item = cart.find(x => String(x.id) === String(id));
  if (item) {
    item.quantity = Math.min(99, Number(item.quantity || 0) + 1);
  } else {
    cart.push({
      id: p.id,
      name: p.name,
      category: p.category,
      price: Number(p.price),
      image: p.image_url || p.image || (Array.isArray(p.image_urls) ? p.image_urls[0] : ""),
      quantity: 1
    });
  }
  saveCart();
  renderCart();
  showToast("Added to cart!");
}

function changeQuantity(id, amount) {
  const item = cart.find(p => String(p.id) === String(id));
  if (!item) return;
  item.quantity = Number(item.quantity) + amount;
  if (item.quantity <= 0) cart = cart.filter(p => String(p.id) !== String(id));
  saveCart();
  renderCart();
}

function renderCart() {
  const countEl = document.getElementById("cartCount");
  const itemsEl = document.getElementById("cartItems");
  const totalEl = document.getElementById("cartTotal");
  if (!countEl || !itemsEl || !totalEl) return;

  const totalQty = cart.reduce((s, p) => s + Number(p.quantity || 0), 0);
  const totalPrice = cart.reduce((s, p) => s + Number(p.price) * Number(p.quantity), 0);

  countEl.textContent = totalQty;
  totalEl.textContent = money(totalPrice);

  itemsEl.innerHTML = cart.length ? cart.map(p => `
    <div class="cart-item">
      <img src="${escapeHTML(p.image || "")}" alt="">
      <div>
        <h4>${escapeHTML(p.name)}</h4>
        <p>${money(p.price)}</p>
        <div class="quantity-controls">
          <button data-qty="${escapeHTML(p.id)}" data-change="-1">−</button>
          <span>${Number(p.quantity)}</span>
          <button data-qty="${escapeHTML(p.id)}" data-change="1">+</button>
        </div>
      </div>
      <button class="remove-btn" data-remove="${escapeHTML(p.id)}">Remove</button>
    </div>
  `).join("") : "<p>Your cart is empty.</p>";
}

function openCart() {
  cartPanel?.classList.add("open");
  overlay?.classList.add("active");
}
function closeCart() {
  cartPanel?.classList.remove("open");
  overlay?.classList.remove("active");
}

/* ============================================================
   FILTERS
   ============================================================ */
function selectCategory(category) {
  selectedCategory = category;
  selectedPriceRange = "all";
  document.querySelectorAll(".filter-btn").forEach(b =>
    b.classList.toggle("active", b.dataset.category === category)
  );
  renderProducts();
  document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
}

function selectPriceRange(range) {
  selectedPriceRange = range;
  selectedCategory = "All";
  document.querySelectorAll(".filter-btn").forEach(b =>
    b.classList.toggle("active", b.dataset.category === "All")
  );
  renderProducts();
  document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
}

/* ============================================================
   EVENTS
   ============================================================ */
productGrid?.addEventListener("click", e => {
  const btn = e.target.closest("[data-add]");
  if (btn && !btn.disabled) {
    e.preventDefault();
    addToCart(btn.dataset.add);
  }
});

document.querySelectorAll(".filter-btn, .category-card").forEach(b => {
  b.addEventListener("click", () => selectCategory(b.dataset.category));
});

document.querySelectorAll(".price-link[data-price-filter]").forEach(link => {
  link.addEventListener("click", e => {
    e.preventDefault();
    selectPriceRange(link.dataset.priceFilter);
  });
});

searchInput?.addEventListener("input", renderProducts);

document.getElementById("searchBtn")?.addEventListener("click", () => {
  const box = document.getElementById("searchBox");
  if (!box) return;
  box.classList.toggle("active");
  if (box.classList.contains("active")) searchInput?.focus();
});

document.getElementById("closeSearch")?.addEventListener("click", () => {
  document.getElementById("searchBox")?.classList.remove("active");
  if (searchInput) searchInput.value = "";
  renderProducts();
});

document.getElementById("cartBtn")?.addEventListener("click", openCart);
document.getElementById("closeCart")?.addEventListener("click", closeCart);
overlay?.addEventListener("click", closeCart);

document.getElementById("menuBtn")?.addEventListener("click", () =>
  document.getElementById("nav")?.classList.toggle("open")
);

document.getElementById("nav")?.addEventListener("click", e => {
  if (e.target.closest("a")) document.getElementById("nav")?.classList.remove("open");
});

document.getElementById("cartItems")?.addEventListener("click", e => {
  const q = e.target.closest("[data-qty]");
  const r = e.target.closest("[data-remove]");
  if (q) changeQuantity(q.dataset.qty, Number(q.dataset.change));
  if (r) {
    cart = cart.filter(p => String(p.id) !== String(r.dataset.remove));
    saveCart();
    renderCart();
  }
});

document.getElementById("checkoutBtn")?.addEventListener("click", () => {
  if (!cart.length) { showToast("Please add a product first."); return; }
  window.location.href = "checkout.html";
});

const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* ============================================================
   LOAD PRODUCTS — Handles missing columns gracefully
   ============================================================ */
async function loadProducts() {
  if (!supabaseConfigured) {
    console.warn("⚠ Supabase not configured — no products to show");
    products = [];
    renderProducts();
    renderCart();
    return;
  }

  console.log("🔄 Loading products from Supabase...");

  try {
    // Attempt 1: Full select
    let { data, error } = await supabase
      .from("products")
      .select("id,name,category,price,old_price,image_url,image_urls,tag,description,stock,video_url,video_urls")
      .eq("active", true)
      .order("created_at", { ascending: false });

    // Fallback 1: without video_urls
    if (error && error.message.includes("video_urls")) {
      console.warn("⚠ video_urls missing — retrying");
      const retry = await supabase
        .from("products")
        .select("id,name,category,price,old_price,image_url,image_urls,tag,description,stock,video_url")
        .eq("active", true)
        .order("created_at", { ascending: false });
      data = retry.data;
      error = retry.error;
    }

    // Fallback 2: without image_urls
    if (error && error.message.includes("image_urls")) {
      console.warn("⚠ image_urls missing — retrying");
      const retry = await supabase
        .from("products")
        .select("id,name,category,price,old_price,image_url,tag,description,stock,video_url")
        .eq("active", true)
        .order("created_at", { ascending: false });
      data = retry.data;
      error = retry.error;
    }

    // Fallback 3: without stock
    if (error && error.message.includes("stock")) {
      console.warn("⚠ stock missing — retrying");
      const retry = await supabase
        .from("products")
        .select("id,name,category,price,old_price,image_url,tag,description,video_url")
        .eq("active", true)
        .order("created_at", { ascending: false });
      data = retry.data;
      error = retry.error;
    }

    // Fallback 4: without video_url
    if (error && error.message.includes("video_url")) {
      console.warn("⚠ video_url missing — retrying");
      const retry = await supabase
        .from("products")
        .select("id,name,category,price,old_price,image_url,tag,description")
        .eq("active", true)
        .order("created_at", { ascending: false });
      data = retry.data;
      error = retry.error;
    }

    // Final fallback: select *
    if (error) {
      console.warn("⚠ All extended selects failed — using select('*')");
      const retry = await supabase
        .from("products")
        .select("*")
        .eq("active", true)
        .order("created_at", { ascending: false });
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error("❌ Products load error:", error.message);
      products = [];
    } else {
      products = data || [];
      console.log(`✅ Loaded ${products.length} products from Supabase`);
      if (products.length > 0) {
        console.log("📦 Sample product:", products[0]);
      }
    }
  } catch (err) {
    console.error("❌ Products fetch failed:", err);
    products = [];
  }

  renderProducts();
  renderCart();
}

/* ============================================================
   INIT
   ============================================================ */
loadProducts();