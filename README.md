# DispatchFlow - Asynchronous Notification Engine

A production-grade, fault-tolerant backend system designed to decouple HTTP request ingestion from background message processing, ensuring high availability and reliable dispatching of transactional notifications.

---

## 🚀 Key Architectural Features

* **Asynchronous Decoupling (BullMQ & Redis):** Offloads high-latency notification tasks from the main Express API gateway into background queues, preventing thread blocking and request timeouts under heavy load.
* **Idempotency & Deduplication:** Utilizes unique tracking tokens (`idempotencyKey`) at the queue layer to eliminate duplicate dispatches and safeguard against retried requests.
* **Time-To-Live (TTL) Expiration Logic:** Built-in worker checks that automatically discard stale or expired jobs (such as out-of-date OTPs) before hitting providers.
* **Strict Edge Validation (Zod):** Enforces rigid payload schemas at the API layer to block malformed or incomplete requests instantly.
* **Sandbox Preview Integration:** Configured with Nodemailer and Ethereal for seamless local development testing and email visual rendering without live production overhead.

---

## 🛠️ Tech Stack

* **Runtime:** Node.js, TypeScript (`tsx`)
* **Framework:** Express.js
* **Queue & Cache:** BullMQ, Redis (via ioredis)
* **Validation:** Zod
* **Delivery & Testing:** Nodemailer, Ethereal SMTP

