import api from "./axios";

/* BAŞLANGIÇ */
export const getConfig = (data) => api.get("/api/config/config/", data);
export const getOnboard = () => api.get("/onboard/");
export const getServices = () => api.get("/api/services/services/");


/* KAYIT VE GİRİŞ */
export const login = (data) => api.post("/api/auth/login/", data);
export const register = (data) => api.post("/api/auth/register/", data);
export const logout = (data) => api.post("/api/auth/logout/", data);
export const accountVerify = (data) => api.post("/api/auth/verify", data);
export const confirmVerifyCode = (data) => api.post("/api/auth/verify-account/", data);
export const requestVerifyCode = (data) => api.post("/api/auth/resend-verification/", data);

export const passwordForgot = (data) => api.post("/api/auth/password-reset/request/", data);
export const passwordResetCode = (data) => api.post("/api/auth/password-reset/verify/", data);
export const passwordReset = (data) => api.post("/api/auth/password-reset/confirm/", data);

export const passwordChangeRequest = (data) => api.post("/api/auth/password-change/request/", data);
export const passwordChangeConfirm = (data) => api.post("/api/auth/password-change/confirm/", data);

export const me = () => api.get("/api/auth/me/");

export const memberShipCancel = (data) => api.post("/api/auth/membership/cancel/", data);
export const deleteAccount = (data) => api.post("/api/auth/delete/", data);
export const updateProfile = (data) => api.put("/api/auth/me/", data);
export const registerPushToken = (data) => api.post("/api/auth/push-token/", data);
export const registerExpoPushToken = (data) => api.post("/api/auth/expo-push-token/", data);
export const listNotifications = () => api.get("/api/notifications/notifications/");
export const deleteNotification = (id) => api.delete(`/api/notifications/notifications/${id}/`);
export const markAllRead = () => api.post("/api/notifications/notifications/mark-all-read/");

/* ADRES */
export const createAddress = (data) => api.post("/api/auth/addresses/", data);
export const listAddresses = () => api.get("/api/auth/addresses/");
export const updateAddress = (data) => api.put(`/api/auth/addresses/${data.id}/`, data);
export const deleteAddress = (id) => api.delete(`/api/auth/addresses/${id}/`);
export const getAddress = (id) => api.get(`/api/auth/addresses/${id}/`);

/* LOCALDE SAKLA */
/* Ödeme Yöntemleri */

export const getPaymentMethod = () => api.get("/payment-method/");
export const getPaymentMethodDetail = (id) => api.get(`/payment-method/detail/${id}/`);
export const createPaymentMethod = (data) => api.post("/payment-method/create/", data);
export const updatePaymentMethod = (data) => api.put("/payment-method/update/", data);
export const deletePaymentMethod = (id) => api.delete(`/payment-method/delete/${id}/`);

/* Faturalar */
export const listInvoices = () => api.get("/api/auth/invoices/");
export const getDefaultInvoice = async () => {
    try {
        const res = await api.get("/api/auth/invoices/");
        const list = Array.isArray(res?.data) ? res.data : [];
        return list.find(i => i.is_default) || list[0] || null;
    } catch (error) {
        return null;
    }
};
export const getInvoice = (id) => api.get(`/api/auth/invoices/${id}/`);
export const createInvoice = (data) => api.post("/api/auth/invoices/", data);
export const updateInvoice = (data) => api.put(`/api/auth/invoices/${data.id}/`, data);
export const deleteInvoice = (id) => api.delete(`/api/auth/invoices/${id}/`);

/* Rezervasyonlar */
export const listActiveReservations = () => api.get("/api/orders/?group=active");
export const listReservationHistory = () => api.get("/api/orders/?group=history");
export const getReservation = (id) => api.get(`/api/orders/${id}/`);
export const createReservation = (data) => api.post("/api/orders/", data);
export const updateReservation = (data) => api.put(`/api/orders/${data.id}/`, data);
export const deleteReservation = (id) => api.delete(`/api/orders/${id}/`);
export const cancelReservation = (id) => api.post(`/api/orders/${id}/cancel/`);

/* Spiarişler */
export const listActiveOrders = () => api.get("/api/orders/");
export const listOrderHistory = () => api.get("/api/orders/");
export const getOrder = (id) => api.get(`/api/orders/${id}/`);
export const createOrder = (data) => api.post("/api/orders/", data);
export const updateOrder = (data) => api.put(`/api/orders/${data.id}/`, data);
export const deleteOrder = (id) => api.delete(`/api/orders/${id}/`);

/* Sürücü İşlemleri */
export const getDriverJobPool = () => api.get("/api/orders/driver/pool/");
export const getDriverMyJobs = () => api.get("/api/orders/driver/my-jobs/");
export const acceptDriverJob = (id) => api.post(`/api/orders/${id}/accept/`);
export const driverOnWay = (id) => api.post(`/api/orders/${id}/on-way/`);
export const driverStartJob = (id) => api.post(`/api/orders/${id}/start/`);
export const completeDriverJob = (id) => api.post(`/api/orders/${id}/complete/`);
export const sendEmergencyAlert = (data) => api.post("/api/orders/emergency-alert/", data);
export const uploadHandoverPhoto = (data) => api.post("/api/orders/handover-photos/", data, {
    headers: {
        'Content-Type': 'multipart/form-data',
    }
});

/* Acil Durum Kişileri */
export const listEmergencyContacts = () => api.get("/api/auth/emergency-contacts/");
export const createEmergencyContact = (data) => api.post("/api/auth/emergency-contacts/", data);
export const updateEmergencyContact = (data) => api.put(`/api/auth/emergency-contacts/${data.id}/`, data);
export const deleteEmergencyContact = (id) => api.delete(`/api/auth/emergency-contacts/${id}/`);

