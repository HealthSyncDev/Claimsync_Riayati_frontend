// Basic mock API client structure

const apiClient = {
    get: async (url) => {
        console.log(`GET request to ${url}`);
        return Promise.resolve({ data: [] });
    },
    post: async (url, data) => {
        console.log(`POST request to ${url}`, data);
        return Promise.resolve({ data: {} });
    },
    put: async (url, data) => {
        console.log(`PUT request to ${url}`, data);
        return Promise.resolve({ data: {} });
    },
    delete: async (url) => {
        console.log(`DELETE request to ${url}`);
        return Promise.resolve({ data: {} });
    },
};

export default apiClient;
