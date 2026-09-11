const K = {
    USERS: "rz_users_v5",
    TICKETS: "rz_tickets_v5",
    ITEMS: "rz_items_v3",
    ORDERS: "rz_file_orders_v2",
    CART: "rz_cart_v2",
    PURCHASES: "rz_purchase_logs_v2",
    SESSION: "rz_session_v5"
};

const DB = "RZDevelopersFilesDB";
const STORE = "files";

const FOUNDERS = [
    "_lordreza_",
    "mahan"
];


let users = read(K.USERS, []);
let tickets = read(K.TICKETS, []);
let items = read(K.ITEMS, []);
let orders = read(K.ORDERS, []);
let cart = read(K.CART, []);
let logs = read(K.PURCHASES, []);
let currentUser = read(K.SESSION, null);

let authMode = "login";
let selectedTicket = null;
let activeOrder = null;
let fileDB = null;


const $ = id => document.getElementById(id);

const esc = value =>
    String(value ?? "").replace(
        /[&<>"']/g,
        char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        }[char])
    );


function read(key, fallback) {
    try {
        return JSON.parse(
            localStorage.getItem(key) ||
            JSON.stringify(fallback)
        );
    } catch {
        return fallback;
    }
}


function save(key, value) {
    localStorage.setItem(
        key,
        JSON.stringify(value)
    );
}


function norm(value) {
    return String(value || "")
        .trim()
        .toLowerCase();
}


function founder(user) {
    return !!user &&
        FOUNDERS.includes(
            norm(user.username)
        );
}


function staff(user = currentUser) {
    return !!user &&
        (
            founder(user) ||
            ["ADMIN", "DEVELOPER"].includes(
                String(user.role || "").toUpperCase()
            )
        );
}


function role(user) {

    if (founder(user)) {
        return "FOUNDER";
    }

    if (
        ["ADMIN", "DEVELOPER"].includes(
            String(user?.role || "").toUpperCase()
        )
    ) {
        return String(user.role).toUpperCase();
    }

    return "MEMBER";
}


function roleName(roleValue) {

    return ({
        FOUNDER: "RZ Founder",
        ADMIN: "Admin",
        DEVELOPER: "Developer",
        MEMBER: "Member"
    }[roleValue] || "Member");
}


function initials(name) {

    return String(name || "RZ")
        .replace(/[^a-zA-Z0-9_]/g, "")
        .slice(0, 2)
        .toUpperCase() || "RZ";
}


/* TOAST */

function toast(message) {

    const box = $("toast");

    box.textContent = message;

    box.classList.add("show");

    clearTimeout(toast.timer);

    toast.timer = setTimeout(() => {
        box.classList.remove("show");
    }, 3000);
}


/* MODAL */

function modal(id, state = true) {

    $(id)?.classList.toggle(
        "open",
        state
    );
}


/* AUTH */

function requireUser() {

    if (!currentUser) {

        openAuth("login");

        toast(
            "برای ادامه ابتدا وارد حساب RZ شوید."
        );

        return false;
    }

    return true;
}


function setAuth(mode) {

    authMode = mode;

    const register = mode === "register";

    $("authTitle").textContent =
        register
            ? "ساخت حساب"
            : "ورود به حساب";

    $("loginTab").classList.toggle(
        "active",
        !register
    );

    $("registerTab").classList.toggle(
        "active",
        register
    );

    $("nameWrap").classList.toggle(
        "hidden",
        !register
    );

    $("emailWrap").classList.toggle(
        "hidden",
        !register
    );

    $("authName").required = register;
    $("authEmail").required = register;

    $("identifierLabel").textContent =
        register
            ? "نام کاربری"
            : "ایمیل یا نام کاربری";

    $("authIdentifier").placeholder =
        register
            ? "برای ثبت‌نام نام کاربری را بالا وارد کنید"
            : "ایمیل یا نام کاربری";

    $("authSubmit").textContent =
        register
            ? "ایجاد حساب"
            : "ورود";
}


function openAuth(mode = "login") {

    setAuth(mode);

    modal(
        "authModal",
        true
    );
}


function register(
    username,
    email,
    password
) {

    username = username.trim();
    email = email.trim().toLowerCase();

    if (
        !username ||
        !email ||
        !password
    ) {
        return toast(
            "همه فیلدها را کامل کنید."
        );
    }


    if (
        !/^[a-zA-Z0-9_.-]{3,24}$/
            .test(username)
    ) {
        return toast(
            "نام کاربری باید ۳ تا ۲۴ کاراکتر انگلیسی باشد."
        );
    }


    if (
        users.some(
            user =>
                norm(user.username) ===
                norm(username)
        )
    ) {
        return toast(
            "این نام کاربری قبلاً گرفته شده است."
        );
    }


    if (
        users.some(
            user =>
                user.email === email
        )
    ) {
        return toast(
            "این ایمیل قبلاً ثبت شده است."
        );
    }


    const isFounder =
        FOUNDERS.includes(
            norm(username)
        );


    const user = {

        id:
            "RZ_" +
            Date.now(),

        username:
            isFounder
                ? (
                    norm(username) ===
                    "_lordreza_"
                        ? "_LordReza_"
                        : "Mahan"
                )
                : username,

        email,

        password,

        role:
            isFounder
                ? "FOUNDER"
                : "MEMBER"
    };


    users.push(user);

    save(
        K.USERS,
        users
    );


    login(user);


    toast(
        isFounder
            ? "حساب Founder با موفقیت ساخته شد 👑"
            : "حساب شما ساخته شد."
    );
}


function login(
    identifier,
    password
) {

    const value =
        norm(identifier);


    const user =
        users.find(
            x =>
                (
                    norm(x.username) === value ||
                    norm(x.email) === value
                ) &&
                x.password === password
        );


    if (!user) {

        return toast(
            "نام کاربری/ایمیل یا رمز عبور اشتباه است."
        );
    }


    if (founder(user)) {

        user.username =
            norm(user.username) ===
            "_lordreza_"
                ? "_LordReza_"
                : "Mahan";

        user.role = "FOUNDER";

        save(
            K.USERS,
            users
        );
    }


    loginSuccess(user);
}


function loginSuccess(user) {

    currentUser = {

        id: user.id,

        username: user.username,

        email: user.email,

        role: role(user)
    };


    save(
        K.SESSION,
        currentUser
    );


    modal(
        "authModal",
        false
    );


    updateHeader();

    refreshDashboard();

    openDashboard();


    toast(
        "خوش آمدید 👋"
    );
}


function logout() {

    currentUser = null;

    localStorage.removeItem(
        K.SESSION
    );

    closeDashboard();

    updateHeader();

    toast(
        "از حساب خارج شدید."
    );
}


/* HEADER */

function updateHeader() {

    const logged =
        !!currentUser;


    $("loginBtn")
        .classList
        .toggle(
            "hidden",
            logged
        );


    $("registerBtn")
        .classList
        .toggle(
            "hidden",
            logged
        );


    $("userBtn")
        .classList
        .toggle(
            "hidden",
            !logged
        );


    if (logged) {

        $("userName").textContent =
            currentUser.username;

        $("userAvatar").textContent =
            initials(
                currentUser.username
            );
    }


    updateCart();
}


/* DASHBOARD */

function openDashboard() {

    if (!requireUser()) {
        return;
    }


    $("dashboard")
        .classList
        .add("open");


    document.body.style.overflow =
        "hidden";


    refreshDashboard();
}


function closeDashboard() {

    $("dashboard")
        .classList
        .remove("open");


    document.body.style.overflow =
        "";
}


function panel(name) {

    if (
        name === "admin" &&
        !founder(currentUser)
    ) {
        return toast(
            "این بخش فقط برای Founder است."
        );
    }


    document
        .querySelectorAll(".panel")
        .forEach(
            panel =>
                panel.classList.remove(
                    "active"
                )
        );


    $("panel-" + name)
        ?.classList
        .add("active");


    document
        .querySelectorAll(
            ".side-nav button"
        )
        .forEach(
            button =>
                button.classList.toggle(
                    "active",
                    button.dataset.panel === name
                )
        );


    const titles = {

        overview: "Overview",

        items: "Files من",

        cart: "سبد خرید",

        myorders: "سفارش‌های من",

        sellrequests: "Sell Requests",

        tickets: "Ticket Center",

        purchases: "Purchase Logs",

        admin: "Administration",

        account: "حساب کاربری"
    };


    $("dashboardTitle").textContent =
        titles[name] || "Overview";


    if (name === "items")
        renderMyItems();

    if (name === "cart")
        renderCart();

    if (name === "myorders")
        renderOrders();

    if (name === "sellrequests")
        renderSellRequests();

    if (name === "tickets")
        renderTickets();

    if (name === "purchases")
        renderLogs();

    if (name === "admin")
        renderAdmin();
}


function refreshDashboard() {

    if (!currentUser)
        return;


    const user =
        users.find(
            x => x.id === currentUser.id
        );


    if (!user) {
        return logout();
    }


    if (founder(user)) {
        user.role = "FOUNDER";
    }


    currentUser = {

        id: user.id,

        username: user.username,

        email: user.email,

        role: role(user)
    };


    save(
        K.USERS,
        users
    );


    save(
        K.SESSION,
        currentUser
    );


    $("sideUsername").textContent =
        currentUser.username;

    $("sideRole").textContent =
        roleName(
            currentUser.role
        );

    $("dashAvatar").textContent =
        initials(
            currentUser.username
        );

    $("welcomeName").textContent =
        currentUser.username;

    $("accountAvatar").textContent =
        initials(
            currentUser.username
        );

    $("accountUsername").value =
        currentUser.username;

    $("accountEmail").value =
        currentUser.email;

    $("accountRole").value =
        roleName(
            currentUser.role
        );


    $("founderBadge")
        .classList
        .toggle(
            "hidden",
            !founder(currentUser)
        );


    $("adminNav")
        .classList
        .toggle(
            "hidden",
            !founder(currentUser)
        );


    $("purchaseLogsNav")
        .classList
        .toggle(
            "hidden",
            !founder(currentUser)
        );


    $("sellRequestNav")
        .classList
        .toggle(
            "hidden",
            !items.some(
                item =>
                    item.userId ===
                    currentUser.id
            )
        );


    const visibleTickets =
        staff()
            ? tickets
            : tickets.filter(
                ticket =>
                    ticket.userId ===
                    currentUser.id
            );


    $("openCount").textContent =
        visibleTickets.filter(
            ticket =>
                ticket.status !==
                "CLOSED"
        ).length;


    $("myItemCount").textContent =
        items.filter(
            item =>
                item.userId ===
                currentUser.id
        ).length;


    $("totalOrders").textContent =
        orders.filter(
            order =>
                order.buyerId ===
                currentUser.id
        ).length;


    renderMyItems();
    renderOrders();
    renderSellRequests();
    renderTickets();
    updateCart();


    if (founder(currentUser)) {

        renderLogs();

        renderAdmin();
    }
}


/* PRICE */

function parsePrice(value) {

    const text =
        String(value || "").trim();


    if (
        !text ||
        /^(free|رایگان|0)$/i.test(text)
    ) {

        return {

            free: true,

            value: 0,

            label: "FREE"
        };
    }


    const number =
        Number(
            text.replace(
                /[,٬]/g,
                ""
            )
        );


    return {

        free: false,

        value:
            Number.isFinite(number)
                ? number
                : 0,

        label:
            number
                ? new Intl.NumberFormat(
                    "fa-IR"
                ).format(number) +
                  " تومان"
                : text
    };
}


/* FILE SIZE */

function bytes(size) {

    if (size < 1024)
        return size + " B";

    if (size < 1048576)
        return (
            size / 1024
        ).toFixed(1) +
        " KB";

    return (
        size / 1048576
    ).toFixed(1) +
    " MB";
}


/* INDEXED DB */

function openDB() {

    return new Promise(
        (resolve, reject) => {

            if (fileDB)
                return resolve(fileDB);


            const request =
                indexedDB.open(
                    DB,
                    1
                );


            request.onupgradeneeded =
                () => {

                    request.result
                        .createObjectStore(
                            STORE
                        );
                };


            request.onsuccess =
                () => {

                    fileDB =
                        request.result;

                    resolve(fileDB);
                };


            request.onerror =
                () =>
                    reject(
                        request.error
                    );
        }
    );
}


async function putFile(
    id,
    file
) {

    const db =
        await openDB();


    return new Promise(
        (resolve, reject) => {

            const tx =
                db.transaction(
                    STORE,
                    "readwrite"
                );


            tx.objectStore(
                STORE
            ).put(
                file,
                id
            );


            tx.oncomplete =
                () => resolve();


            tx.onerror =
                () => reject(
                    tx.error
                );
        }
    );
}


async function getFile(id) {

    const db =
        await openDB();


    return new Promise(
        (resolve, reject) => {

            const request =
                db.transaction(
                    STORE
                )
                .objectStore(
                    STORE
                )
                .get(id);


            request.onsuccess =
                () =>
                    resolve(
                        request.result
                    );


            request.onerror =
                () =>
                    reject(
                        request.error
                    );
        }
    );
}


async function delFile(id) {

    const db =
        await openDB();


    return new Promise(
        (resolve, reject) => {

            const tx =
                db.transaction(
                    STORE,
                    "readwrite"
                );


            tx.objectStore(
                STORE
            ).delete(id);


            tx.oncomplete =
                resolve;


            tx.onerror =
                () =>
                    reject(
                        tx.error
                    );
        }
    );
}


/* FILE SEARCH */

function itemMatches(
    item,
    query
) {

    query =
        norm(query);


    if (!query)
        return true;


    return [
        item.name,
        item.description,
        item.category,
        item.username,
        item.fileName
    ].some(
        value =>
            norm(value)
                .includes(query)
    );
}


let activeFilter = "all";


/* PUBLIC FILES */

function renderPublic() {

    const query =
        $("searchInput")?.value ||
        "";


    const array =
        items.filter(
            item => {

                if (
                    activeFilter ===
                    "free" &&
                    !parsePrice(
                        item.price
                    ).free
                ) {
                    return false;
                }


                if (
                    activeFilter ===
                    "paid" &&
                    parsePrice(
                        item.price
                    ).free
                ) {
                    return false;
                }


                if (
                    activeFilter ===
                    "mine" &&
                    (
                        !currentUser ||
                        item.userId !==
                        currentUser.id
                    )
                ) {
                    return false;
                }


                return itemMatches(
                    item,
                    query
                );
            }
        );


    $("statFiles").textContent =
        items.length;

    $("statUsers").textContent =
        users.length;


    const box =
        $("publicItems");


    if (!array.length) {

        box.innerHTML = `
            <div
                class="empty"
                style="grid-column:1/-1"
            >
                هنوز فایلی با این فیلتر پیدا نشد.
            </div>
        `;

        return;
    }


    box.innerHTML =
        array
            .map(fileCard)
            .join("");
}


/* FILE CARD */

function fileCard(item) {

    const price =
        parsePrice(
            item.price
        );


    const own =
        currentUser &&
        item.userId ===
        currentUser.id;


    return `

        <article class="file-card">

            <div class="file-top">

                <div class="file-logo">
                    ${esc(
                        initials(
                            item.category
                        )
                    )}
                </div>

                <span
                    class="price ${
                        price.free
                            ? ""
                            : "paid"
                    }"
                >
                    ${esc(
                        price.label
                    )}
                </span>

            </div>


            <h3>
                ${esc(item.name)}
            </h3>


            <p>
                ${esc(
                    item.description
                )}
            </p>


            <div class="file-meta">

                <span>
                    ${esc(
                        item.category
                    )}
                </span>

                <span>
                    ${esc(
                        item.fileName
                    )}
                </span>

                <span>
                    ${bytes(
                        item.size || 0
                    )}
                </span>

            </div>


            <div class="file-bottom">

                <div class="author">
                    by
                    <b>
                        ${esc(
                            item.username
                        )}
                    </b>
                </div>


                <div class="file-actions">

                    ${
                        price.free

                            ? `
                                <button
                                    class="btn primary"
                                    onclick="requestFree('${item.id}')"
                                >
                                    دانلود
                                </button>
                              `

                            : `
                                <button
                                    class="btn primary"
                                    onclick="addCart('${item.id}')"
                                >
                                    🛒 خرید
                                </button>
                              `
                    }


                    ${
                        own

                            ? `
                                <button
                                    class="btn"
                                    onclick="deleteItem('${item.id}')"
                                >
                                    حذف
                                </button>
                              `

                            : ""
                    }

                </div>

            </div>

        </article>
    `;
}


/* FREE ORDER */

async function requestFree(id) {

    if (!requireUser())
        return;


    const item =
        items.find(
            x => x.id === id
        );


    if (!item)
        return;


    const order = {

        id:
            "ORD_" +
            Date.now(),

        itemId: id,

        itemName:
            item.name,

        fileName:
            item.fileName,

        buyerId:
            currentUser.id,

        buyerUsername:
            currentUser.username,

        sellerId:
            item.userId,

        sellerUsername:
            item.username,

        type:
            "FREE",

        status:
            "APPROVED",

        price:
            "Free",

        createdAt:
            new Date().toISOString()
    };


    orders.unshift(order);


    save(
        K.ORDERS,
        orders
    );


    showPayment(order);
}


/* CART */

function addCart(id) {

    if (!requireUser())
        return;


    const item =
        items.find(
            x => x.id === id
        );


    if (!item)
        return;


    if (
        parsePrice(
            item.price
        ).free
    ) {
        return requestFree(id);
    }


    if (
        !cart.includes(id)
    ) {
        cart.push(id);
    }


    save(
        K.CART,
        cart
    );


    updateCart();

    toast(
        "به سبد خرید اضافه شد 🛒"
    );


    openDashboard();

    panel("cart");
}


function removeCart(id) {

    cart =
        cart.filter(
            x => x !== id
        );


    save(
        K.CART,
        cart
    );


    renderCart();

    updateCart();
}


function updateCart() {

    $("cartCount").textContent =
        cart.length;

    $("dashboardCartCount").textContent =
        cart.length;
}


/* CART RENDER */

function renderCart() {

    const valid =
        cart
            .map(
                id =>
                    items.find(
                        item =>
                            item.id === id
                    )
            )
            .filter(
                item =>
                    item &&
                    !parsePrice(
                        item.price
                    ).free
            );


    cart =
        valid.map(
            item => item.id
        );


    save(
        K.CART,
        cart
    );


    const box =
        $("cartItems");


    if (!valid.length) {

        box.innerHTML = `
            <div class="empty">
                سبد خرید خالی است.
            </div>
        `;

        $("cartSummary").innerHTML = "";

        return;
    }


    box.innerHTML =
        valid
            .map(
                item => `

                    <div class="cart-item">

                        <div class="file-logo">
                            ${esc(
                                initials(
                                    item.category
                                )
                            )}
                        </div>

                        <div class="grow">

                            <b>
                                ${esc(
                                    item.name
                                )}
                            </b>

                            <small>
                                ${esc(
                                    item.username
                                )}
                                •
                                ${esc(
                                    parsePrice(
                                        item.price
                                    ).label
                                )}
                            </small>

                        </div>

                        <button
                            class="btn"
                            onclick="removeCart('${item.id}')"
                        >
                            حذف
                        </button>

                    </div>
                `
            )
            .join("");


    const total =
        valid.reduce(
            (
                total,
                item
            ) =>
                total +
                parsePrice(
                    item.price
                ).value,
            0
        );


    $("cartSummary").innerHTML = `

        <h3>
            Checkout
        </h3>

        <p>

            ${valid.length}
            فایل انتخاب شده است.

            <br>

            مجموع:

            <b style="color:#fff">
                ${
                    new Intl.NumberFormat(
                        "fa-IR"
                    ).format(total)
                }
                تومان
            </b>

        </p>

        <button
            class="btn primary full"
            onclick="checkout()"
        >
            ادامه پرداخت ←
        </button>

    `;
}


/* CHECKOUT */

function checkout() {

    if (!cart.length)
        return;


    const chosen =
        cart
            .map(
                id =>
                    items.find(
                        item =>
                            item.id === id
                    )
            )
            .filter(
                item =>
                    item &&
                    !parsePrice(
                        item.price
                    ).free
            );


    if (!chosen.length)
        return;


    const first =
        chosen.find(
            item =>
                item.payUrl
        ) ||
        chosen[0];


    if (!first.payUrl) {

        return toast(
            "برای این فایل لینک پرداخت ثبت نشده است."
        );
    }


    chosen.forEach(
        item => {

            const order = {

                id:
                    "ORD_" +
                    Date.now() +
                    "_" +
                    Math.random()
                        .toString(36)
                        .slice(2, 6),

                itemId:
                    item.id,

                itemName:
                    item.name,

                fileName:
                    item.fileName,

                buyerId:
                    currentUser.id,

                buyerUsername:
                    currentUser.username,

                sellerId:
                    item.userId,

                sellerUsername:
                    item.username,

                type:
                    "PAID",

                status:
                    "PENDING",

                price:
                    item.price,

                createdAt:
                    new Date().toISOString()
            };


            orders.unshift(order);


            logs.unshift({

                id:
                    "LOG_" +
                    Date.now() +
                    Math.random(),

                action:
                    "ORDER_CREATED",

                orderId:
                    order.id,

                item:
                    item.name,

                buyer:
                    currentUser.username,

                price:
                    item.price,

                time:
                    new Date().toISOString()
            });
        }
    );


    save(
        K.ORDERS,
        orders
    );


    save(
        K.PURCHASES,
        logs
    );


    cart = [];

    save(
        K.CART,
        cart
    );


    updateCart();


    window.open(
        first.payUrl,
        "_blank",
        "noopener"
    );


    showPayment(
        orders[0]
    );
}


/* PAYMENT */

function showPayment(order) {

    activeOrder =
        order.id;


    $("paymentIcon").textContent =
        order.status === "APPROVED"
            ? "✓"
            : order.status === "REJECTED"
                ? "×"
                : "⏳";


    $("paymentTitle").textContent =
        order.status === "APPROVED"
            ? "فایل آماده دریافت است"
            : order.status === "REJECTED"
                ? "درخواست رد شد"
                : "درخواست خرید ثبت شد";


    $("paymentText").textContent =
        order.status === "APPROVED"

            ? `فایل «${order.itemName}» برای حساب شما فعال شده است.`

            : order.status === "REJECTED"

                ? `فروشنده درخواست خرید «${order.itemName}» را رد کرده است.`

                : `پرداخت را انجام دهید؛ بعد از بررسی پرداخت، فروشنده می‌تواند درخواست را تأیید کند.`;


    const item =
        items.find(
            x => x.id === order.itemId
        );


    $("paymentDownload").innerHTML =

        order.status === "APPROVED" &&
        item

            ? `
                <button
                    class="btn primary full"
                    style="margin-bottom:9px"
                    onclick="downloadItem('${item.id}')"
                >
                    ⬇ دانلود فایل
                </button>
              `

            : `
                <div
                    class="empty"
                    style="margin:15px 0"
                >
                    بعد از تأیید فروشنده،
                    دکمه دانلود همین‌جا فعال می‌شود.
                </div>
              `;


    $("paymentPage")
        .classList
        .add("open");


    document.body.style.overflow =
        "hidden";
}


/* DOWNLOAD */

async function downloadItem(id) {

    if (!requireUser())
        return;


    const item =
        items.find(
            x => x.id === id
        );


    if (!item)
        return;


    const price =
        parsePrice(
            item.price
        );


    if (
        !price.free &&
        !orders.some(
            order =>
                order.itemId === id &&
                order.buyerId ===
                    currentUser.id &&
                order.status ===
                    "APPROVED"
        )
    ) {

        return toast(
            "این فایل هنوز تأیید نشده است."
        );
    }


    try {

        const blob =
            await getFile(id);


        if (!blob) {

            return toast(
                "فایل پیدا نشد؛ لطفاً از صاحب فایل بخواهید دوباره منتشر کند."
            );
        }


        const url =
            URL.createObjectURL(
                blob
            );


        const anchor =
            document.createElement(
                "a"
            );


        anchor.href = url;

        anchor.download =
            item.fileName ||
            item.name;


        document.body.appendChild(
            anchor
        );


        anchor.click();

        anchor.remove();


        setTimeout(
            () =>
                URL.revokeObjectURL(
                    url
                ),
            1000
        );


        toast(
            "دانلود شروع شد."
        );

    } catch (error) {

        console.error(error);

        toast(
            "دریافت فایل انجام نشد."
        );
    }
}


/* DELETE FILE */

async function deleteItem(id) {

    if (!requireUser())
        return;


    const item =
        items.find(
            x => x.id === id
        );


    if (
        !item ||
        item.userId !==
            currentUser.id
    ) {

        return toast(
            "اجازه حذف این فایل را ندارید."
        );
    }


    if (
        !confirm(
            "این فایل حذف شود؟"
        )
    ) {
        return;
    }


    items =
        items.filter(
            x => x.id !== id
        );


    cart =
        cart.filter(
            x => x !== id
        );


    save(
        K.ITEMS,
        items
    );


    save(
        K.CART,
        cart
    );


    await delFile(id)
        .catch(
            () => {}
        );


    renderPublic();

    refreshDashboard();

    toast(
        "فایل حذف شد."
    );
}


/* PUBLISH */

async function publish(event) {

    event.preventDefault();


    if (!requireUser())
        return;


    const file =
        $("itemFile")
            .files[0];


    const name =
        $("itemName")
            .value
            .trim();


    const description =
        $("itemDesc")
            .value
            .trim();


    const price =
        $("itemPrice")
            .value
            .trim();


    const payUrl =
        $("itemPay")
            .value
            .trim();


    if (!file) {

        return toast(
            "ابتدا فایل را انتخاب کنید."
        );
    }


    if (
        file.size >
        8 * 1024 * 1024
    ) {

        return toast(
            "حجم فایل نباید بیشتر از 8MB باشد."
        );
    }


    const parsedPrice =
        parsePrice(price);


    if (
        !parsedPrice.free &&
        !payUrl
    ) {

        return toast(
            "برای فایل پولی لینک پرداخت لازم است."
        );
    }


    const id =
        "FILE_" +
        Date.now() +
        "_" +
        Math.random()
            .toString(36)
            .slice(2, 7);


    try {

        await putFile(
            id,
            file
        );


        const item = {

            id,

            name,

            description,

            price,

            payUrl,

            category:
                $("itemCategory")
                    .value,

            fileName:
                file.name,

            size:
                file.size,

            userId:
                currentUser.id,

            username:
                currentUser.username,

            createdAt:
                new Date()
                    .toISOString()
        };


        items.unshift(item);


        save(
            K.ITEMS,
            items
        );


        modal(
            "publishModal",
            false
        );


        $("itemForm").reset();


        $("fileLabel").textContent =
            "فایل را انتخاب کنید";


        renderPublic();

        refreshDashboard();


        toast(
            "فایل با موفقیت منتشر شد 🚀"
        );

    } catch (error) {

        console.error(error);

        toast(
            "ذخیره فایل انجام نشد."
        );
    }
}


/* MY FILES */

function renderMyItems() {

    if (!currentUser)
        return;


    const array =
        items.filter(
            item =>
                item.userId ===
                currentUser.id
        );


    const box =
        $("myItems");


    if (!array.length) {

        box.innerHTML = `
            <div class="empty">
                هنوز فایلی منتشر نکرده‌اید.
            </div>
        `;

        return;
    }


    box.innerHTML =
        array
            .map(
                item => `

                    <div class="dash-row">

                        <div class="file-logo">
                            ${esc(
                                initials(
                                    item.category
                                )
                            )}
                        </div>

                        <div class="grow">

                            <b>
                                ${esc(
                                    item.name
                                )}
                            </b>

                            <small>
                                ${esc(
                                    item.fileName
                                )}

                                •

                                ${bytes(
                                    item.size
                                )}

                                •

                                ${esc(
                                    parsePrice(
                                        item.price
                                    ).label
                                )}
                            </small>

                        </div>


                        <div class="row-actions">

                            <button
                                class="btn"
                                onclick="deleteItem('${item.id}')"
                            >
                                حذف
                            </button>

                        </div>

                    </div>

                `
            )
            .join("");
}


/* ORDERS */

function renderOrders() {

    if (!currentUser)
        return;


    const array =
        orders.filter(
            order =>
                order.buyerId ===
                currentUser.id
        );


    const box =
        $("myOrders");


    if (!array.length) {

        box.innerHTML = `
            <div class="empty">
                هنوز سفارشی ندارید.
            </div>
        `;

        return;
    }


    box.innerHTML =
        array
            .map(
                order => `

                    <div class="order-card">

                        <div class="file-logo">
                            RZ
                        </div>

                        <div class="grow">

                            <b>
                                ${esc(
                                    order.itemName
                                )}
                            </b>

                            <small>
                                ${esc(
                                    order.sellerUsername
                                )}
                                •
                                ${esc(
                                    order.price ||
                                    "Free"
                                )}
                            </small>

                        </div>


                        <span
                            class="badge ${
                                order.status ===
                                "APPROVED"
                                    ? ""
                                    : "wait"
                            }"
                        >

                            ${
                                order.status ===
                                "APPROVED"

                                    ? "تأیید شده"

                                    : order.status ===
                                      "REJECTED"

                                        ? "رد شده"

                                        : "در انتظار تأیید"
                            }

                        </span>


                        ${
                            order.status ===
                            "APPROVED"

                                ? `
                                    <button
                                        class="btn primary"
                                        onclick="downloadItem('${order.itemId}')"
                                    >
                                        دانلود
                                    </button>
                                  `

                                : ""
                        }

                    </div>

                `
            )
            .join("");
}


/* SELL REQUESTS */

function renderSellRequests() {

    if (!currentUser)
        return;


    const array =
        orders.filter(
            order =>
                order.sellerId ===
                    currentUser.id &&
                order.type ===
                    "PAID"
        );


    const box =
        $("sellRequests");


    if (!array.length) {

        box.innerHTML = `
            <div class="empty">
                درخواست خریدی برای فایل‌های شما نیست.
            </div>
        `;

        return;
    }


    box.innerHTML =
        array
            .map(
                order => `

                    <div class="request-card">

                        <div class="grow">

                            <b>
                                ${esc(
                                    order.itemName
                                )}
                            </b>

                            <small>

                                خریدار:
                                ${esc(
                                    order.buyerUsername
                                )}

                                •

                                مبلغ:
                                ${esc(
                                    order.price
                                )}

                            </small>

                        </div>


                        <span
                            class="badge ${
                                order.status ===
                                "APPROVED"
                                    ? ""
                                    : "wait"
                            }"
                        >

                            ${
                                order.status ===
                                "PENDING"

                                    ? "در انتظار"

                                    : order.status ===
                                      "APPROVED"

                                        ? "تأیید شده"

                                        : "رد شده"
                            }

                        </span>


                        ${
                            order.status ===
                            "PENDING"

                                ? `
                                    <div class="row-actions">

                                        <button
                                            class="btn primary"
                                            onclick="reviewOrder('${order.id}','APPROVED')"
                                        >
                                            بله
                                        </button>

                                        <button
                                            class="btn"
                                            onclick="reviewOrder('${order.id}','REJECTED')"
                                        >
                                            خیر
                                        </button>

                                    </div>
                                  `

                                : ""
                        }

                    </div>

                `
            )
            .join("");
}


/* REVIEW ORDER */

function reviewOrder(
    id,
    status
) {

    const order =
        orders.find(
            x => x.id === id
        );


    if (
        !order ||
        order.sellerId !==
            currentUser.id
    ) {
        return;
    }


    if (
        order.status !==
        "PENDING"
    ) {
        return;
    }


    order.status =
        status;


    order.reviewedAt =
        new Date()
            .toISOString();


    save(
        K.ORDERS,
        orders
    );


    logs.unshift({

        id:
            "LOG_" +
            Date.now(),

        action:
            status === "APPROVED"
                ? "ORDER_APPROVED"
                : "ORDER_REJECTED",

        orderId:
            order.id,

        item:
            order.itemName,

        buyer:
            order.buyerUsername,

        price:
            order.price,

        time:
            new Date()
                .toISOString()
    });


    save(
        K.PURCHASES,
        logs
    );


    renderSellRequests();

    renderOrders();


    if (
        activeOrder ===
        order.id &&
        order.buyerId ===
        currentUser.id
    ) {

        showPayment(order);
    }


    toast(
        status === "APPROVED"
            ? "سفارش تأیید شد."
            : "سفارش رد شد."
    );
}


/* TICKET STATUS */

const TS = {

    WAITING:
        "در انتظار پاسخ",

    ANSWERED:
        "پاسخ داده شده",

    IN_PROGRESS:
        "درحال پیگیری",

    CLOSED:
        "بسته شده"
};


/* CREATE TICKET */

function createTicket(event) {

    event.preventDefault();


    if (!requireUser())
        return;


    const ticket = {

        id:
            "TKT_" +
            Date.now(),

        userId:
            currentUser.id,

        username:
            currentUser.username,

        subject:
            $("ticketSubject")
                .value,

        priority:
            $("ticketPriority")
                .value,

        status:
            "WAITING",

        createdAt:
            new Date()
                .toISOString(),

        messages: [

            {

                from:
                    currentUser.username,

                staff:
                    false,

                text:
                    $("ticketMessage")
                        .value
                        .trim(),

                time:
                    new Date()
                        .toISOString()
            }

        ]

    };


    tickets.unshift(
        ticket
    );


    save(
        K.TICKETS,
        tickets
    );


    $("ticketForm").reset();


    modal(
        "ticketModal",
        false
    );


    selectedTicket =
        ticket.id;


    openDashboard();

    panel("tickets");

    refreshDashboard();


    toast(
        "Ticket ثبت شد."
    );
}


/* RENDER TICKETS */

function renderTickets() {

    if (!currentUser)
        return;


    const array =
        staff()
            ? tickets
            : tickets.filter(
                ticket =>
                    ticket.userId ===
                    currentUser.id
            );


    const box =
        $("ticketList");


    if (!array.length) {

        box.innerHTML = `
            <div class="empty">
                تیکتی وجود ندارد.
            </div>
        `;

        return;
    }


    box.innerHTML =
        array
            .map(
                ticket => `

                    <div
                        class="
                            ticket-list-item
                            ${
                                selectedTicket ===
                                ticket.id
                                    ? "active"
                                    : ""
                            }
                        "
                        onclick="
                            selectTicket('${ticket.id}')
                        "
                    >

                        <b>
                            ${esc(
                                ticket.subject
                            )}
                        </b>

                        <small>

                            ${esc(
                                TS[
                                    ticket.status
                                ] ||
                                TS.WAITING
                            )}

                            •

                            ${esc(
                                ticket.priority
                            )}

                        </small>

                    </div>
                `
            )
            .join("");


    if (
        selectedTicket &&
        array.some(
            ticket =>
                ticket.id ===
                selectedTicket
        )
    ) {

        renderThread(
            selectedTicket
        );
    }
}


/* SELECT TICKET */

function selectTicket(id) {

    selectedTicket =
        id;

    renderTickets();

    renderThread(id);
}


/* THREAD */

function renderThread(id) {

    const ticket =
        tickets.find(
            x => x.id === id
        );


    if (!ticket) {

        $("ticketThread").innerHTML = `
            <div class="empty">
                تیکت پیدا نشد.
            </div>
        `;

        return;
    }


    const closed =
        ticket.status ===
        "CLOSED";


    $("ticketThread").innerHTML = `

        <div
            style="
                display:flex;
                justify-content:space-between;
                gap:10px;
                align-items:center;
                margin-bottom:15px;
            "
        >

            <div>

                <b style="font-size:12px">
                    ${esc(
                        ticket.subject
                    )}
                </b>

                <small
                    style="
                        display:block;
                        color:#7d859a;
                        font-size:8px;
                        margin-top:4px;
                    "
                >
                    ${esc(
                        TS[
                            ticket.status
                        ] ||
                        TS.WAITING
                    )}
                </small>

            </div>


            ${
                staff()

                    ? `
                        <select
                            class="status-select"
                            onchange="
                                setTicketStatus(
                                    '${ticket.id}',
                                    this.value
                                )
                            "
                            ${closed ? "disabled" : ""}
                        >

                            ${
                                Object.entries(
                                    TS
                                )
                                .map(
                                    ([key,value]) => `

                                        <option
                                            value="${key}"
                                            ${
                                                ticket.status ===
                                                key
                                                    ? "selected"
                                                    : ""
                                            }
                                        >
                                            ${value}
                                        </option>

                                    `
                                )
                                .join("")
                            }

                        </select>
                      `

                    : ""
            }

        </div>


        ${
            (ticket.messages || [])
                .map(
                    message => `

                        <div
                            class="
                                message
                                ${
                                    message.staff
                                        ? "staff"
                                        : ""
                                }
                            "
                        >

                            <b>
                                ${esc(
                                    message.from
                                )}

                                ${
                                    message.staff
                                        ? "• Staff"
                                        : ""
                                }
                            </b>

                            <p>
                                ${esc(
                                    message.text
                                )}
                            </p>

                            <small>
                                ${
                                    new Date(
                                        message.time
                                    )
                                    .toLocaleString(
                                        "fa-IR"
                                    )
                                }
                            </small>

                        </div>
                    `
                )
                .join("")
        }


        ${
            closed

                ? `
                    <div class="empty">
                        این Ticket بسته شده و امکان ارسال پیام وجود ندارد.
                    </div>
                  `

                : `
                    <div class="thread-compose">

                        <input
                            id="replyInput"
                            placeholder="پیام خود را بنویسید..."
                        >

                        <button
                            class="btn primary"
                            onclick="
                                replyTicket(
                                    '${ticket.id}'
                                )
                            "
                        >
                            ارسال
                        </button>

                    </div>
                  `
        }

    `;
}


/* REPLY */

function replyTicket(id) {

    if (!currentUser)
        return;


    const ticket =
        tickets.find(
            x => x.id === id
        );


    if (
        !ticket ||
        ticket.status ===
            "CLOSED"
    ) {

        return toast(
            "این Ticket بسته شده است."
        );
    }


    const input =
        $("replyInput");


    const text =
        input?.value.trim();


    if (!text)
        return;


    const isStaff =
        staff();


    ticket.messages.push({

        from:
            currentUser.username,

        staff:
            isStaff,

        text,

        time:
            new Date()
                .toISOString()
    });


    if (
        isStaff &&
        ticket.status !==
            "IN_PROGRESS"
    ) {

        ticket.status =
            "ANSWERED";
    }


    if (
        !isStaff &&
        ticket.status ===
            "ANSWERED"
    ) {

        ticket.status =
            "WAITING";
    }


    save(
        K.TICKETS,
        tickets
    );


    renderTickets();

    renderThread(id);


    toast(
        "پیام ارسال شد."
    );
}


/* CHANGE TICKET STATUS */

function setTicketStatus(
    id,
    status
) {

    if (!staff())
        return;


    const ticket =
        tickets.find(
            x => x.id === id
        );


    if (
        !ticket ||
        ticket.status ===
            "CLOSED"
    ) {
        return;
    }


    ticket.status =
        status;


    save(
        K.TICKETS,
        tickets
    );


    renderTickets();

    renderThread(id);
}


/* LOGS */

function renderLogs() {

    if (!founder(currentUser))
        return;


    const box =
        $("purchaseLogs");


    if (!logs.length) {

        box.innerHTML = `
            <div class="empty">
                لاگی ثبت نشده است.
            </div>
        `;

        return;
    }


    box.innerHTML =
        logs
            .slice(0,100)
            .map(
                log => `

                    <div class="dash-row">

                        <div class="file-logo">
                            ⌁
                        </div>

                        <div class="grow">

                            <b>
                                ${esc(
                                    log.item
                                )}
                            </b>

                            <small>

                                ${esc(
                                    log.action
                                )}

                                •

                                Buyer:
                                ${esc(
                                    log.buyer
                                )}

                                •

                                ${esc(
                                    log.price ||
                                    ""
                                )}

                            </small>

                        </div>

                        <small>
                            ${
                                new Date(
                                    log.time
                                )
                                .toLocaleString(
                                    "fa-IR"
                                )
                            }
                        </small>

                    </div>

                `
            )
            .join("");
}


/* ADMIN */

function renderAdmin() {

    if (!founder(currentUser))
        return;


    const box =
        $("adminUsers");


    box.innerHTML =
        users
            .map(
                user => `

                    <div class="admin-row">

                        <div>

                            <b>
                                ${
                                    founder(user)
                                        ? "👑 "
                                        : ""
                                }

                                ${esc(
                                    user.username
                                )}
                            </b>

                            <small>
                                ${esc(
                                    user.email
                                )}
                            </small>

                        </div>


                        <div>

                            ${
                                founder(user)

                                    ? `
                                        <span class="badge">
                                            FOUNDER
                                        </span>
                                      `

                                    : `
                                        <select
                                            class="role-select"
                                            onchange="
                                                changeRole(
                                                    '${user.id}',
                                                    this.value
                                                )
                                            "
                                        >

                                            <option
                                                value="MEMBER"
                                                ${
                                                    role(user) ===
                                                    "MEMBER"
                                                        ? "selected"
                                                        : ""
                                                }
                                            >
                                                Member
                                            </option>

                                            <option
                                                value="DEVELOPER"
                                                ${
                                                    role(user) ===
                                                    "DEVELOPER"
                                                        ? "selected"
                                                        : ""
                                                }
                                            >
                                                Developer
                                            </option>

                                            <option
                                                value="ADMIN"
                                                ${
                                                    role(user) ===
                                                    "ADMIN"
                                                        ? "selected"
                                                        : ""
                                                }
                                            >
                                                Admin
                                            </option>

                                        </select>
                                      `
                            }

                        </div>


                        <div>

                            <small>
                                ${esc(
                                    user.id
                                )}
                            </small>

                        </div>

                    </div>
                `
            )
            .join("");
}


/* CHANGE ROLE */

function changeRole(
    id,
    newRole
) {

    if (!founder(currentUser))
        return;


    const user =
        users.find(
            x => x.id === id
        );


    if (
        !user ||
        founder(user)
    ) {
        return;
    }


    user.role =
        [
            "MEMBER",
            "ADMIN",
            "DEVELOPER"
        ].includes(
            newRole
        )
            ? newRole
            : "MEMBER";


    save(
        K.USERS,
        users
    );


    renderAdmin();

    toast(
        "Role تغییر کرد."
    );
}


/* OPEN TICKET */

function openTicket() {

    if (!requireUser())
        return;


    modal(
        "ticketModal",
        true
    );
}


/* CLOSE PAYMENT */

function closePayment() {

    activeOrder = null;

    $("paymentPage")
        .classList
        .remove("open");

    document.body.style.overflow =
        "";
}


/* EVENT WIRING */

function wire() {

    $("loginBtn").onclick =
        () =>
            openAuth("login");


    $("registerBtn").onclick =
        () =>
            openAuth("register");


    $("userBtn").onclick =
        openDashboard;


    $("headerCart").onclick =
        () => {

            if (
                requireUser()
            ) {

                openDashboard();

                panel("cart");
            }

        };


    $("heroSell").onclick =
        () => {

            if (
                requireUser()
            ) {

                modal(
                    "publishModal",
                    true
                );
            }

        };


    $("publishTop").onclick =
    $("publishDash").onclick =
        () => {

            if (
                requireUser()
            ) {

                modal(
                    "publishModal",
                    true
                );
            }

        };


    $("newTicket").onclick =
    $("ticketDash").onclick =
        openTicket;


    $("closeDashboard").onclick =
        closeDashboard;


    $("homeSide").onclick =
        () => {

            closeDashboard();

            location.hash =
                "top";
        };


    $("logoutBtn").onclick =
        logout;


    $("paymentClose").onclick =
        closePayment;


    $("authForm").onsubmit =
        event => {

            event.preventDefault();


            if (
                authMode ===
                "register"
            ) {

                register(
                    $("authName").value,
                    $("authEmail").value,
                    $("authPassword").value
                );

            } else {

                login(
                    $("authIdentifier").value,
                    $("authPassword").value
                );
            }

        };


    $("loginTab").onclick =
        () =>
            setAuth("login");


    $("registerTab").onclick =
        () =>
            setAuth("register");


    $("itemForm").onsubmit =
        publish;


    $("ticketForm").onsubmit =
        createTicket;


    $("searchInput").oninput =
        renderPublic;


    document
        .querySelectorAll(".filter")
        .forEach(
            button => {

                button.onclick =
                    () => {

                        activeFilter =
                            button.dataset.filter;


                        document
                            .querySelectorAll(
                                ".filter"
                            )
                            .forEach(
                                x =>
                                    x.classList.remove(
                                        "active"
                                    )
                            );


                        button.classList.add(
                            "active"
                        );


                        renderPublic();
                    };

            }
        );


    document
        .querySelectorAll(
            "[data-close]"
        )
        .forEach(
            button => {

                button.onclick =
                    () =>
                        modal(
                            button.dataset.close,
                            false
                        );

            }
        );


    document
        .querySelectorAll(
            ".side-nav button[data-panel]"
        )
        .forEach(
            button => {

                button.onclick =
                    () =>
                        panel(
                            button.dataset.panel
                        );

            }
        );


    document
        .querySelectorAll(
            ".quick-grid button[data-panel]"
        )
        .forEach(
            button => {

                button.onclick =
                    () =>
                        panel(
                            button.dataset.panel
                        );

            }
        );


    $("dropzone").onclick =
        () =>
            $("itemFile").click();


    $("itemFile").onchange =
        () => {

            const file =
                $("itemFile")
                    .files[0];


            $("fileLabel").textContent =
                file
                    ? `${file.name} • ${bytes(file.size)}`
                    : "فایل را انتخاب کنید";
        };


    document
        .querySelectorAll(".modal")
        .forEach(
            modalElement => {

                modalElement.addEventListener(
                    "click",
                    event => {

                        if (
                            event.target ===
                            modalElement
                        ) {

                            modal(
                                modalElement.id,
                                false
                            );
                        }

                    }
                );

            }
        );
}


/* CROSS TAB */

window.addEventListener(
    "storage",
    event => {

        if (!event.key)
            return;


        if (
            event.key ===
            K.ITEMS
        ) {

            items =
                read(
                    K.ITEMS,
                    []
                );


            renderPublic();


            if (currentUser)
                renderMyItems();
        }


        if (
            event.key ===
            K.ORDERS
        ) {

            orders =
                read(
                    K.ORDERS,
                    []
                );


            if (activeOrder) {

                const order =
                    orders.find(
                        x =>
                            x.id ===
                            activeOrder
                    );


                if (order) {
                    showPayment(order);
                }
            }


            if (currentUser)
                refreshDashboard();
        }


        if (
            event.key ===
            K.TICKETS
        ) {

            tickets =
                read(
                    K.TICKETS,
                    []
                );


            if (currentUser)
                refreshDashboard();
        }

    }
);


/* START */

window.addEventListener(
    "load",
    async () => {

        wire();


        await openDB()
            .catch(
                () => {}
            );


        updateHeader();

        renderPublic();


        if (
            currentUser &&
            users.some(
                user =>
                    user.id ===
                    currentUser.id
            )
        ) {

            openDashboard();

        } else {

            currentUser = null;

            localStorage.removeItem(
                K.SESSION
            );
        }

    }
);