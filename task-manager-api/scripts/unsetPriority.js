const mongoose = require('mongoose');
const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/taskmanager';

async function run(){
  try{
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    const r = await mongoose.connection.db.collection('tasks').updateMany({ priority: 'medium' }, { $unset: { priority: '' } });
    console.log('matched', r.matchedCount, 'modified', r.modifiedCount);
    await mongoose.disconnect();
    process.exit(0);
  }catch(e){
    console.error(e);
    process.exit(1);
  }
}
run();
