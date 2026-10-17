// API Base URL configuration for user authentication endpoints
const BASE_URL = "https://route-posts.routemisr.com";

/**
 * Data contract payload required for user registration (Sign up).
 */
export type SignupPayload = {
  name: string;
  username: string;
  email: string;
  dateOfBirth: string;
  gender: "male" | "female";
  password: string;
  rePassword: string;
};

/**
 * Data contract payload required for user authentication (Login).
 */
export type LoginPayload = {
  login: string;
  password: string;
};

/**
 * Generic internal POST request helper method.
 * Handles serializing JS objects to JSON, sending content headers, and parsing API errors.
 *
 * @template T - The expected return type of the JSON response payload
 * @param endpoint - Relative API path endpoint (e.g., "/users/signup")
 * @param payload - Request body object to be serialized into JSON
 */
async function postRequest<T>(
  endpoint: string,
  payload: object
): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  // Extract and parse JSON response payload
  const result = await response.json();

  // Validate network response status
  if (!response.ok) {
    throw new Error(result.message || "Request failed");
  }

  return result as T;
}

/**
 * Registers a new user account with the provided payload details.
 *
 * @param payload - User registration field details
 */
export function signupUser(payload: SignupPayload) {
  return postRequest<{
    success: boolean;
    message: string;
    data?: Record<string, unknown>;
  }>("/users/signup", payload);
}

/**
 * Authenticates a user with login credentials and returns a user token session.
 *
 * @param payload - User login credentials (email/username and password)
 */
export function loginUser(payload: LoginPayload) {
  return postRequest<{
    success: boolean;
    message: string;
    data: {
      token: string;
      user: Record<string, unknown>;
    };
  }>("/users/signin", payload);
}

/**
 * Data contract payload required for updating an existing password.
 */
export type ChangePasswordPayload = {
  password: string;
  newPassword: string;
};

/**
 * Sends a PATCH request to change the authenticated user's current password.
 * Requires a valid Bearer token in localStorage.
 *
 * @param payload - Contains current password and new password values
 */
export async function changePasswordUser(
  payload: ChangePasswordPayload
) {
  // Retrieve authentication token stored in local storage
  const token = localStorage.getItem("token");

  // Perform PATCH request to change password endpoint
  const response = await fetch(
    `${BASE_URL}/users/change-password`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    }
  );

  // Safely parse and format error message if response is not ok
  if (!response.ok) {
    const text = await response.text();
    let message = "Failed to change password.";

    if (text) {
      try {
        const result = JSON.parse(text);
        message = result.message || message;
      } catch {
        message = text;
      }
    }

    throw new Error(message);
  }
}