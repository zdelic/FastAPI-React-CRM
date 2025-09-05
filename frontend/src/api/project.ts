import api from "./axios";
import type { User } from "./users";

export async function getProjectUsers(projectId: number): Promise<User[]> {
  const { data } = await api.get(`/projects/${projectId}/users`);
  return data;
}

export async function addUserToProject(projectId: number, userId: number): Promise<User> {
  const { data } = await api.post(`/projects/${projectId}/users`, { user_id: userId });
  return data;
}

export async function removeUserFromProject(projectId: number, userId: number): Promise<void> {
  await api.delete(`/projects/${projectId}/users/${userId}`);
}

export async function replaceProjectUsers(projectId: number, userIds: number[]): Promise<User[]> {
  const { data } = await api.put(`/projects/${projectId}/users`, { user_ids: userIds });
  return data;
}

export const fetchProjects = async () => {
  try {
    const response = await api.get("/projects");
    return response.data;
  } catch (error) {
    console.error("Greška prilikom dohvaćanja projekata:", error);
    throw error;
  }
};


export const createProject = async (data: {
  name: string;
  description: string;
  start_date?: string; // 👈 dodaj ovo
}) => {
  const response = await api.post("/projects", data);
  return response.data;
};


export const fetchStructure = async (projectId: number) => {
  const response = await api.get(`/projects/${projectId}/structure`);
  return response.data;
};


