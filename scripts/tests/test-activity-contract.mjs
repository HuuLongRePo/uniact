#!/usr/bin/env node

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const TEACHER_EMAIL = process.env.TEACHER_EMAIL || "gvcn.nguyenvanmanh@annd.edu.vn";
const TEACHER_PASSWORD = process.env.TEACHER_PASSWORD || "teacher123";

let pass = 0;
let fail = 0;
let cookieHeader = "";
let createdActivityId = "";

const printPass = (message) => {
  console.log(`PASS ${message}`);
  pass += 1;
};

const printFail = (message, details) => {
  console.log(`FAIL ${message}`);
  if (details) {
    console.log(`  ${details}`);
  }
  fail += 1;
};

const parseJsonSafely = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const readCookieHeader = (headers) => {
  if (typeof headers.getSetCookie === "function") {
    const cookies = headers
      .getSetCookie()
      .map((value) => value.split(";")[0])
      .filter(Boolean);

    if (cookies.length > 0) {
      return cookies.join("; ");
    }
  }

  const singleHeader = headers.get("set-cookie");
  if (!singleHeader) {
    return "";
  }

  return singleHeader.split(";")[0];
};

const requestJson = async (method, url, body) => {
  const headers = {};

  if (cookieHeader) {
    headers.Cookie = cookieHeader;
  }

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  return {
    status: response.status,
    text,
    json: parseJsonSafely(text),
  };
};

const hasValidationField = (json, field) =>
  json?.success === false &&
  json?.code === "VALIDATION_ERROR" &&
  json?.details &&
  Object.prototype.hasOwnProperty.call(json.details, field);

const extractFirstClassId = (json) => {
  const candidates = [json?.data?.classes, json?.classes, json?.data, json?.items].filter(Array.isArray);
  const firstItem = candidates[0]?.[0];
  return firstItem?.id ?? firstItem?.class_id ?? "";
};

const extractCreatedActivityId = (json) =>
  json?.data?.activity?.id ?? json?.activity?.id ?? json?.data?.id ?? json?.id ?? "";

const isActivitySuccess = (json) => json?.success === true && Boolean(json?.data?.activity || json?.activity);

const formatIsoAfterHours = (hours) => new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

console.log("Activity API Contract Test");
console.log(`BASE_URL=${BASE_URL}`);
console.log("");

try {
  const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: TEACHER_EMAIL,
      password: TEACHER_PASSWORD,
    }),
  });

  const loginText = await loginResponse.text();
  cookieHeader = readCookieHeader(loginResponse.headers);

  if (loginResponse.status !== 200) {
    printFail("Dang nhap giao vien that bai", `HTTP=${loginResponse.status} body=${loginText.slice(0, 240)}`);
    console.log("");
    console.log("Contract test dung lai do khong dang nhap duoc.");
    process.exit(1);
  }

  if (!cookieHeader.includes("token=")) {
    printFail("Dang nhap thanh cong nhung khong lay duoc cookie token");
    console.log("");
    console.log("Contract test dung lai do khong co cookie xac thuc.");
    process.exit(1);
  }

  printPass("Dang nhap giao vien thanh cong");

  const classesResponse = await requestJson("GET", `${BASE_URL}/api/classes`);
  const classId = extractFirstClassId(classesResponse.json);

  if (classesResponse.status !== 200) {
    printFail(
      "Lay danh sach lop that bai",
      `HTTP=${classesResponse.status} body=${classesResponse.text.slice(0, 240)}`,
    );
    console.log("");
    console.log("Contract test dung lai do khong lay duoc lop hop le.");
    process.exit(1);
  }

  if (!classId) {
    printFail("Khong tim thay class_id hop le tu /api/classes");
    console.log("");
    console.log("Contract test dung lai do khong co class_id.");
    process.exit(1);
  }

  printPass(`Lay duoc class_id=${classId}`);

  const eventDate = formatIsoAfterHours(96);
  const deadlineTooSoon = formatIsoAfterHours(84);
  const deadlineOk = formatIsoAfterHours(60);

  const invalidCreate = await requestJson("POST", `${BASE_URL}/api/activities`, {
    title: "",
    date_time: "invalid-date",
    location: "",
    max_participants: 0,
    class_ids: ["x"],
  });

  if (invalidCreate.status === 400 && hasValidationField(invalidCreate.json, "title")) {
    printPass("POST invalid payload tra ve 400 + details");
  } else {
    printFail(
      "POST invalid payload khong tra ve validation dung",
      `HTTP=${invalidCreate.status} body=${invalidCreate.text.slice(0, 240)}`,
    );
  }

  const deadlineTooShort = await requestJson("POST", `${BASE_URL}/api/activities`, {
    title: "Test deadline too short",
    description: "Contract test",
    date_time: eventDate,
    location: "P.101",
    max_participants: 30,
    class_ids: [classId],
    registration_deadline: deadlineTooSoon,
  });

  if (deadlineTooShort.status === 400 && hasValidationField(deadlineTooShort.json, "registration_deadline")) {
    printPass("POST deadline <24h tra ve 400");
  } else {
    printFail(
      "POST deadline <24h khong tra ve validation dung",
      `HTTP=${deadlineTooShort.status} body=${deadlineTooShort.text.slice(0, 240)}`,
    );
  }

  const classMismatchCreate = await requestJson("POST", `${BASE_URL}/api/activities`, {
    title: "Test invalid class",
    description: "Contract test",
    date_time: eventDate,
    location: "P.102",
    max_participants: 20,
    class_ids: [999999],
  });

  if (classMismatchCreate.status === 400 && hasValidationField(classMismatchCreate.json, "class_ids")) {
    printPass("POST invalid class_ids tra ve 400");
  } else {
    printFail(
      "POST invalid class_ids khong tra ve validation dung",
      `HTTP=${classMismatchCreate.status} body=${classMismatchCreate.text.slice(0, 240)}`,
    );
  }

  const createTitle = `Contract Test ${Date.now()}`;
  const validCreate = await requestJson("POST", `${BASE_URL}/api/activities`, {
    title: createTitle,
    description: "Contract create success",
    date_time: eventDate,
    location: "Phong test",
    max_participants: 40,
    class_ids: [classId],
    registration_deadline: deadlineOk,
  });

  createdActivityId = String(extractCreatedActivityId(validCreate.json) || "");

  if (validCreate.status === 201 && createdActivityId) {
    printPass(`POST valid payload tra ve 201 (activity_id=${createdActivityId})`);
  } else {
    printFail(
      "POST valid payload khong tao duoc activity",
      `HTTP=${validCreate.status} body=${validCreate.text.slice(0, 240)}`,
    );
  }

  if (createdActivityId) {
    const invalidUpdate = await requestJson("PUT", `${BASE_URL}/api/activities/${createdActivityId}`, {
      max_participants: 0,
    });

    if (invalidUpdate.status === 400 && hasValidationField(invalidUpdate.json, "max_participants")) {
      printPass("PUT invalid payload tra ve 400 + details");
    } else {
      printFail(
        "PUT invalid payload khong tra ve validation dung",
        `HTTP=${invalidUpdate.status} body=${invalidUpdate.text.slice(0, 240)}`,
      );
    }

    const classMismatchUpdate = await requestJson("PUT", `${BASE_URL}/api/activities/${createdActivityId}`, {
      class_ids: [999999],
    });

    if (classMismatchUpdate.status === 400 && hasValidationField(classMismatchUpdate.json, "class_ids")) {
      printPass("PUT invalid class_ids tra ve 400");
    } else {
      printFail(
        "PUT invalid class_ids khong tra ve validation dung",
        `HTTP=${classMismatchUpdate.status} body=${classMismatchUpdate.text.slice(0, 240)}`,
      );
    }

    const deadlineUpdate = await requestJson("PUT", `${BASE_URL}/api/activities/${createdActivityId}`, {
      registration_deadline: deadlineTooSoon,
    });

    if (deadlineUpdate.status === 400 && hasValidationField(deadlineUpdate.json, "registration_deadline")) {
      printPass("PUT deadline <24h tra ve 400");
    } else {
      printFail(
        "PUT deadline <24h khong tra ve validation dung",
        `HTTP=${deadlineUpdate.status} body=${deadlineUpdate.text.slice(0, 240)}`,
      );
    }

    const validUpdate = await requestJson("PUT", `${BASE_URL}/api/activities/${createdActivityId}`, {
      title: `${createTitle} (updated)`,
      location: "Phong test 2",
      max_participants: 45,
      class_ids: [classId],
    });

    if (validUpdate.status === 200 && isActivitySuccess(validUpdate.json)) {
      printPass("PUT valid payload tra ve 200");
    } else {
      printFail(
        "PUT valid payload khong cap nhat duoc activity",
        `HTTP=${validUpdate.status} body=${validUpdate.text.slice(0, 240)}`,
      );
    }
  }
} catch (error) {
  printFail("Script gap loi khong mong muon", error instanceof Error ? error.message : String(error));
}

console.log("");
console.log("==============================");
console.log("Activity Contract Test Summary");
console.log("==============================");
console.log(`Passed: ${pass}`);
console.log(`Failed: ${fail}`);

if (createdActivityId) {
  console.log(`Created activity id: ${createdActivityId}`);
}

console.log("");

if (fail > 0) {
  process.exit(1);
}
