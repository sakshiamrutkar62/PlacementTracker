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
        password_hash: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        password: {
            type: DataTypes.VIRTUAL,
            allowNull: true,
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
        password_reset_token: {
            type: DataTypes.STRING,
            field: 'reset_token'
        },
        password_reset_expires: {
            type: DataTypes.DATE,
            field: 'reset_token_expiry'
        },
    }, {
        sequelize,
        modelName: 'User',
        tableName: 'users',
        underscored: true, // Use snake_case for database columns
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false, // No updated_at column in database
        hooks: {
            beforeCreate: async (user) => {
                if (user.password_hash) {
                    const salt = await bcrypt.genSalt(10);
                    user.password_hash = await bcrypt.hash(user.password_hash, salt);
                } else if (user.password) {
                    const salt = await bcrypt.genSalt(10);
                    user.password_hash = await bcrypt.hash(user.password, salt);
                    user.password = null; // Clear legacy field
                }
            },
            beforeUpdate: async (user) => {
                if (user.changed('password_hash')) {
                    const salt = await bcrypt.genSalt(10);
                    user.password_hash = await bcrypt.hash(user.password_hash, salt);
                } else if (user.changed('password')) {
                    const salt = await bcrypt.genSalt(10);
                    user.password_hash = await bcrypt.hash(user.password, salt);
                    user.password = null; // Clear legacy field
                }
            },
        },
    });

    User.prototype.correctPassword = async function (candidatePassword) {
        const passwordToCheck = this.password_hash || this.password;
        return await bcrypt.compare(candidatePassword, passwordToCheck);
    };

    return User;
};
