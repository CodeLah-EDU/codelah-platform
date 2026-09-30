const DAILY_API = 'https://api.daily.co/v1';
class DailyRequestError extends Error {
  status: number;
  constructor(status: number) {
    super(`Daily request failed (${status})`);
    this.status = status;
  }
}
export const CLASSROOM_EARLY_JOIN_SECONDS = 15 * 60;
export const CLASSROOM_LATE_JOIN_SECONDS = 30 * 60;
export const CLASSROOM_MAX_PARTICIPANTS = 5;

export type ClassroomWindow = 'early' | 'open' | 'closed';

export function classroomWindow(
  startsAt: string,
  endsAt: string,
  now = Date.now(),
): ClassroomWindow {
  const starts =
    new Date(startsAt).getTime() - CLASSROOM_EARLY_JOIN_SECONDS * 1000;
  const ends = new Date(endsAt).getTime() + CLASSROOM_LATE_JOIN_SECONDS * 1000;
  if (!Number.isFinite(starts) || !Number.isFinite(ends))
    throw new Error('Invalid lesson time');
  return now < starts ? 'early' : now <= ends ? 'open' : 'closed';
}

export function dailyRoomName(lessonId: string) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      lessonId,
    )
  )
    throw new Error('Invalid lesson ID');
  return `codelah-${lessonId.replaceAll('-', '').toLowerCase()}`;
}

export function dailyRoomRequest(
  lessonId: string,
  startsAt: string,
  endsAt: string,
) {
  return {
    name: dailyRoomName(lessonId),
    privacy: 'private',
    properties: {
      nbf:
        Math.floor(new Date(startsAt).getTime() / 1000) -
        CLASSROOM_EARLY_JOIN_SECONDS,
      exp:
        Math.floor(new Date(endsAt).getTime() / 1000) +
        CLASSROOM_LATE_JOIN_SECONDS,
      max_participants: CLASSROOM_MAX_PARTICIPANTS,
      enable_prejoin_ui: true,
      enable_people_ui: true,
      enable_network_ui: true,
      enable_screenshare: true,
      enable_recording: false,
      enable_chat: false,
      enable_knocking: false,
      eject_at_room_exp: true,
      enforce_unique_user_ids: true,
    },
  };
}

export function dailyTokenRequest({
  roomName,
  userId,
  userName,
  owner,
  expiresAt,
}: {
  roomName: string;
  userId: string;
  userName: string;
  owner: boolean;
  expiresAt: number;
}) {
  return {
    properties: {
      room_name: roomName,
      user_id: userId,
      user_name: userName.slice(0, 100),
      is_owner: owner,
      exp: expiresAt,
      eject_at_token_exp: true,
      enable_prejoin_ui: true,
      enable_screenshare: owner,
      enable_recording: false,
      enable_recording_ui: false,
      start_cloud_recording: false,
      auto_start_transcription: false,
    },
  };
}

export function dailyConfigured() {
  return Boolean(process.env.DAILY_API_KEY);
}

async function dailyRequest(path: string, init: RequestInit) {
  const key = process.env.DAILY_API_KEY;
  if (!key) throw new Error('Daily is not configured');
  const response = await fetch(`${DAILY_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
  });
  const body = (await response.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!response.ok) throw new DailyRequestError(response.status);
  return body;
}

export async function createDailyRoom(
  lessonId: string,
  startsAt: string,
  endsAt: string,
) {
  const body = await dailyRequest('/rooms', {
    method: 'POST',
    body: JSON.stringify(dailyRoomRequest(lessonId, startsAt, endsAt)),
  });
  if (typeof body?.name !== 'string' || typeof body?.url !== 'string')
    throw new Error('Daily returned an invalid room');
  return { name: body.name, url: body.url };
}

export async function deleteDailyRoom(roomName: string) {
  await dailyRequest(`/rooms/${encodeURIComponent(roomName)}`, {
    method: 'DELETE',
  });
}

// Reconcile provider timing from the authorised lesson immediately before joining.
// Calendar rescheduling must not leave a room on its original opening/expiry time.
export async function syncDailyRoom(
  lessonId: string,
  startsAt: string,
  endsAt: string,
) {
  const { name, ...config } = dailyRoomRequest(lessonId, startsAt, endsAt);
  try {
    await dailyRequest(`/rooms/${encodeURIComponent(name)}`, {
      method: 'POST',
      body: JSON.stringify(config),
    });
  } catch (error) {
    if (!(error instanceof DailyRequestError) || error.status !== 404)
      throw error;
    await createDailyRoom(lessonId, startsAt, endsAt);
  }
}

export async function createDailyToken(
  input: Parameters<typeof dailyTokenRequest>[0],
) {
  const body = await dailyRequest('/meeting-tokens', {
    method: 'POST',
    body: JSON.stringify(dailyTokenRequest(input)),
  });
  if (typeof body?.token !== 'string')
    throw new Error('Daily returned an invalid token');
  return body.token;
}
