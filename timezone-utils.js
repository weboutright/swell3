/**
 * TIMEZONE UTILITY FUNCTIONS
 * Add these functions to your HTML files to handle timezone conversion
 */

// Get user's timezone
function getUserTimezone() {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

// Get timezone offset in minutes
function getTimezoneOffset(date, timezone) {
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    return (tzDate.getTime() - utcDate.getTime()) / 60000;
}

// Convert ISO string from business timezone to user's local timezone
function convertToUserTimezone(isoString, businessTimezone, userTimezone) {
    const date = new Date(isoString);
    
    // Format in user's timezone
    const options = {
        timeZone: userTimezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    };
    
    return date.toLocaleString('en-US', options);
}

// Convert ISO string to user's timezone with full date
function convertToUserTimezoneWithDate(isoString, businessTimezone, userTimezone) {
    const date = new Date(isoString);
    
    const options = {
        timeZone: userTimezone,
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    };
    
    return date.toLocaleString('en-US', options);
}

// Get timezone name abbreviation
function getTimezoneAbbreviation(timezone) {
    const date = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        timeZoneName: 'short'
    });
    
    const parts = formatter.formatToParts(date);
    const timeZonePart = parts.find(part => part.type === 'timeZoneName');
    return timeZonePart ? timeZonePart.value : timezone;
}

// Check if date changes when converting timezones (crossing midnight)
function doesDateChange(isoString, businessTimezone, userTimezone) {
    const date = new Date(isoString);
    
    const businessDate = new Date(date.toLocaleString('en-US', { timeZone: businessTimezone }));
    const userDate = new Date(date.toLocaleString('en-US', { timeZone: userTimezone }));
    
    return businessDate.getDate() !== userDate.getDate() ||
           businessDate.getMonth() !== userDate.getMonth() ||
           businessDate.getFullYear() !== userDate.getFullYear();
}

// Format time with timezone indicator
function formatTimeWithTimezone(isoString, timezone) {
    const date = new Date(isoString);
    const tzAbbr = getTimezoneAbbreviation(timezone);
    
    const timeOptions = {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    };
    
    const time = date.toLocaleString('en-US', timeOptions);
    return `${time} ${tzAbbr}`;
}

// Display timezone warning if different from business timezone
function getTimezoneWarning(userTimezone, businessTimezone) {
    if (userTimezone === businessTimezone) {
        return null;
    }
    
    const userAbbr = getTimezoneAbbreviation(userTimezone);
    const businessAbbr = getTimezoneAbbreviation(businessTimezone);
    
    return {
        userTimezone: userTimezone,
        businessTimezone: businessTimezone,
        userAbbr: userAbbr,
        businessAbbr: businessAbbr,
        message: `Times shown in your local timezone (${userAbbr}). Business operates in ${businessAbbr}.`
    };
}

// Example usage in widget:
/*
const userTimezone = getUserTimezone();
const businessTimezone = 'Australia/Brisbane';

// When displaying available slots from API:
availableSlots.forEach(slot => {
    const userTime = convertToUserTimezone(slot.start, businessTimezone, userTimezone);
    console.log(`Available: ${userTime}`);
});

// Show timezone warning:
const warning = getTimezoneWarning(userTimezone, businessTimezone);
if (warning) {
    console.log(warning.message);
}
*/
