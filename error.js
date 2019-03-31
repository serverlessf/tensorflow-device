exports.noService = (res, name) => res.status(404).json('Cant find service '+name);
exports.serviceExists = (res, name) => res.status(405).json('Service '+name+' already exists');
