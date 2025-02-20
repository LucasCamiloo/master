const config = {
    mongoUri: process.env.MONGODB_URI || 'mongodb+srv://admin:0000@cluster0.tfg20.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0',
    masterUrl: process.env.MASTER_URL || 'https://master-teste.vercel.app',
    slaveUrl: process.env.SLAVE_URL || 'https://slave-teste.vercel.app',
    port: process.env.PORT || 4000,
    db: {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 10,
        connectTimeoutMS: 30000,
        socketTimeoutMS: 30000,
        family: 4
    }
};

export default config;
