async function sleep(delay) {
    return new Promise((resolve) => {
        setTimeout(resolve, delay);
    });
}


module.sleep = sleep;