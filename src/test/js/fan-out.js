// Function that calls many different functions (fan-out)

function formatName(name) {
    return name.trim();
}

function validateEmail(email) {
    return email.includes('@');
}

function validateAge(age) {
    return age >= 0 && age < 150;
}

function validatePhone(phone) {
    return phone.length >= 10;
}

function saveToDatabase(data) {
    return { id: 1, ...data };
}

function sendWelcomeEmail(user) {
    return `welcome ${user.name}`;
}

function logRegistration(user) {
    console.log('registered:', user.name);
}

function registerUser(name, email, age, phone) {
    const formatted = formatName(name);
    const validEmail = validateEmail(email);
    const validAge = validateAge(age);
    const validPhone = validatePhone(phone);

    if (!validEmail || !validAge || !validPhone) {
        throw new Error('validation failed');
    }

    const user = saveToDatabase({ name: formatted, email, age, phone });
    sendWelcomeEmail(user);
    logRegistration(user);
    return user;
}