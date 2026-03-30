'use strict';
const { Model } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
    class User extends Model {
        static associate(models) {
            User.hasMany(models.Application, { foreignKey: 'userId' });
            User.belongsToMany(models.Skill, { through: models.UserSkill, foreignKey: 'userId' });
        }
    }
    User.init({
        full_name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true,
            },
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        role: {
            type: DataTypes.ENUM('student', 'admin'),
            defaultValue: 'student',
        },
        resume_link: DataTypes.STRING,
        skills: DataTypes.JSONB, // Using JSONB for array of strings
        verified_skills: DataTypes.JSONB,
        batch_year: DataTypes.INTEGER,
        college_verified: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        password_reset_token: DataTypes.STRING,
        password_reset_expires: DataTypes.DATE,
    }, {
        sequelize,
        modelName: 'User',
        tableName: 'users',
        hooks: {
            beforeCreate: async (user) => {
                if (user.password) {
                    const salt = await bcrypt.genSalt(10);
                    user.password = await bcrypt.hash(user.password, salt);
                }
            },
            beforeUpdate: async (user) => {
                if (user.changed('password')) {
                    const salt = await bcrypt.genSalt(10);
                    user.password = await bcrypt.hash(user.password, salt);
                }
            },
        },
    });

    User.prototype.correctPassword = async function (candidatePassword) {
        return await bcrypt.compare(candidatePassword, this.password);
    };

    return User;
};
