export const TOKEN_KEY = 'meetlink_token';

export const storage = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (token) => localStorage.setItem(TOKEN_KEY, token),
  removeToken: () => localStorage.removeItem(TOKEN_KEY),

  getBookingDraft: () => {
    const raw = sessionStorage.getItem('booking_draft');
    return raw ? JSON.parse(raw) : null;
  },
  setBookingDraft: (data) => sessionStorage.setItem('booking_draft', JSON.stringify(data)),
  clearBookingDraft: () => sessionStorage.removeItem('booking_draft'),
};
