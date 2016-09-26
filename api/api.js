export const validateEmail = (email) => {
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
};
export const saveContestEntry = (contestName, email, year, month, photoPath) => {

};

export const convertFromUSD = (value, currency) => {
    switch (currency) {
        case 'USD':
            return value * 1;
        case 'GBP':
            return value * 0.6;
        case "BTC":
            return value * 0.0023707918444761;
        default:
            return NaN
    }
};